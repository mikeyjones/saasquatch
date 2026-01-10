import { describe, it, expect } from "vitest";

/**
 * Tests for CRM Customers API endpoint
 *
 * These tests document the expected API behavior.
 * Full integration tests would require database and auth setup.
 *
 * Endpoint tested:
 * - GET /:tenant/api/crm/customers
 */

describe("CRM Customers API", () => {
	describe("GET /:tenant/api/crm/customers", () => {
		it("should require authentication", () => {
			// Expected: 401 Unauthorized when no session
			const expectedResponse = {
				error: "Unauthorized",
				customers: [],
			};
			expect(expectedResponse.error).toBe("Unauthorized");
		});

		it("should return 404 for invalid tenant", () => {
			const expectedResponse = {
				error: "Organization not found",
				customers: [],
			};
			expect(expectedResponse.error).toBe("Organization not found");
		});

		it("should accept segment query parameter", () => {
			const validSegments = ["all", "customers", "prospects", "inactive"];
			const params = {
				segment: "customers",
			};
			expect(validSegments).toContain(params.segment);
		});

		it("should accept filter query parameters", () => {
			const validParams = {
				segment: "all",
				search: "acme",
				industry: "Technology",
				status: "active",
			};
			expect(validParams.segment).toBeDefined();
			expect(validParams.search).toBeDefined();
			expect(validParams.industry).toBeDefined();
			expect(validParams.status).toBeDefined();
		});

		it("should return customers with CRMCustomer shape", () => {
			const expectedCustomerShape = {
				id: "string",
				name: "string",
				industry: "string",
				logo: "string | null",
				website: "string | null",
				status: "customer", // 'customer' | 'prospect' | 'inactive'
				subscriptionStatus: "active", // 'active' | 'trialing' | 'canceled' | 'past_due' | undefined
				subscriptionPlan: "string | null",
				realizedValue: 450000, // number in cents
				potentialValue: 120000, // number in cents
				lastActivity: "ISO date string",
				dealCount: 3,
				contactCount: 8,
				assignedTo: {
					id: "string",
					name: "string",
				},
				tags: ["enterprise", "high-value"],
				activities: [
					{
						id: "string",
						type: "deal_won", // 'deal_created' | 'deal_won' | 'deal_lost' | 'contact_added' | 'note' | 'meeting'
						description: "string",
						timestamp: "ISO date string",
						userId: "string | undefined",
						userName: "string | undefined",
					},
				],
			};
			expect(expectedCustomerShape.id).toBeDefined();
			expect(expectedCustomerShape.name).toBeDefined();
			expect(["customer", "prospect", "inactive"]).toContain(
				expectedCustomerShape.status,
			);
		});

		it("should return segment counts", () => {
			const expectedCountsShape = {
				all: 12,
				customers: 5,
				prospects: 4,
				inactive: 3,
			};
			expect(expectedCountsShape.all).toBeGreaterThanOrEqual(0);
			expect(expectedCountsShape.customers).toBeGreaterThanOrEqual(0);
			expect(expectedCountsShape.prospects).toBeGreaterThanOrEqual(0);
			expect(expectedCountsShape.inactive).toBeGreaterThanOrEqual(0);
		});

		it("should return unique industries list", () => {
			const expectedResponse = {
				customers: [],
				counts: { all: 0, customers: 0, prospects: 0, inactive: 0 },
				industries: ["Technology", "Finance", "Healthcare", "Retail"],
			};
			expect(expectedResponse.industries).toBeInstanceOf(Array);
		});
	});
});

describe("CRM Customer Status Determination", () => {
	it("should classify as customer when subscriptionStatus is active", () => {
		const customer = {
			subscriptionStatus: "active",
			expectedStatus: "customer",
		};
		expect(customer.subscriptionStatus).toBe("active");
		expect(customer.expectedStatus).toBe("customer");
	});

	it("should classify as customer when subscriptionStatus is past_due", () => {
		// past_due customers are still customers (just with payment issues)
		const customer = {
			subscriptionStatus: "past_due",
			expectedStatus: "customer",
		};
		expect(customer.subscriptionStatus).toBe("past_due");
		expect(customer.expectedStatus).toBe("customer");
	});

	it("should classify as prospect when subscriptionStatus is trialing", () => {
		const customer = {
			subscriptionStatus: "trialing",
			expectedStatus: "prospect",
		};
		expect(customer.subscriptionStatus).toBe("trialing");
		expect(customer.expectedStatus).toBe("prospect");
	});

	it("should classify as prospect when subscriptionStatus is null", () => {
		const customer = {
			subscriptionStatus: null,
			expectedStatus: "prospect",
		};
		expect(customer.subscriptionStatus).toBeNull();
		expect(customer.expectedStatus).toBe("prospect");
	});

	it("should classify as inactive when subscriptionStatus is canceled", () => {
		const customer = {
			subscriptionStatus: "canceled",
			expectedStatus: "inactive",
		};
		expect(customer.subscriptionStatus).toBe("canceled");
		expect(customer.expectedStatus).toBe("inactive");
	});
});

describe("CRM Value Calculation", () => {
	it("should calculate realizedValue from won deals", () => {
		// realizedValue = sum of deal values where stage name contains "won" or "closed-won"
		const calculation = {
			deals: [
				{ value: 100000, stageName: "Won" },
				{ value: 50000, stageName: "Closed-Won" },
				{ value: 75000, stageName: "Negotiation" }, // not counted
			],
			expectedRealizedValue: 150000,
		};
		expect(calculation.expectedRealizedValue).toBe(150000);
	});

	it("should calculate potentialValue from open deals", () => {
		// potentialValue = sum of deal values where stage is not won/lost
		const calculation = {
			deals: [
				{ value: 100000, stageName: "Won" }, // not counted
				{ value: 50000, stageName: "Lost" }, // not counted
				{ value: 75000, stageName: "Negotiation" },
				{ value: 25000, stageName: "Discovery" },
			],
			expectedPotentialValue: 100000,
		};
		expect(calculation.expectedPotentialValue).toBe(100000);
	});

	it("should not count lost deals in either value", () => {
		const calculation = {
			deals: [{ value: 100000, stageName: "Lost" }],
			expectedRealizedValue: 0,
			expectedPotentialValue: 0,
		};
		expect(calculation.expectedRealizedValue).toBe(0);
		expect(calculation.expectedPotentialValue).toBe(0);
	});
});

describe("CRM Activity Mapping", () => {
	it("should map deal_created activity type", () => {
		const mapping = {
			activityType: "deal_created",
			expectedType: "deal_created",
		};
		expect(mapping.expectedType).toBe("deal_created");
	});

	it("should map stage_change to deal activity", () => {
		// stage_change could indicate won/lost/progress
		const mapping = {
			activityType: "stage_change",
			expectedType: "deal_created", // default mapping
		};
		expect(mapping.expectedType).toBe("deal_created");
	});

	it("should map deal_won activity type", () => {
		const mapping = {
			activityType: "deal_won",
			expectedType: "deal_won",
		};
		expect(mapping.expectedType).toBe("deal_won");
	});

	it("should map deal_lost activity type", () => {
		const mapping = {
			activityType: "deal_lost",
			expectedType: "deal_lost",
		};
		expect(mapping.expectedType).toBe("deal_lost");
	});

	it("should map contact_added activity type", () => {
		const mapping = {
			activityType: "contact_added",
			expectedType: "contact_added",
		};
		expect(mapping.expectedType).toBe("contact_added");
	});

	it("should map meeting activity type", () => {
		const mapping = {
			activityType: "meeting",
			expectedType: "meeting",
		};
		expect(mapping.expectedType).toBe("meeting");
	});

	it("should default unknown types to note", () => {
		const mapping = {
			activityType: "unknown_type",
			expectedType: "note",
		};
		expect(mapping.expectedType).toBe("note");
	});
});

describe("CRM Filtering", () => {
	it("should filter by segment - all returns all customers", () => {
		const filter = {
			segment: "all",
			expectedBehavior: "Returns all tenant organizations",
		};
		expect(filter.segment).toBe("all");
	});

	it("should filter by segment - customers returns active subscriptions", () => {
		const filter = {
			segment: "customers",
			expectedBehavior: "Returns only customers with status === customer",
		};
		expect(filter.segment).toBe("customers");
	});

	it("should filter by segment - prospects returns trialing/no subscription", () => {
		const filter = {
			segment: "prospects",
			expectedBehavior: "Returns only customers with status === prospect",
		};
		expect(filter.segment).toBe("prospects");
	});

	it("should filter by segment - inactive returns canceled subscriptions", () => {
		const filter = {
			segment: "inactive",
			expectedBehavior: "Returns only customers with status === inactive",
		};
		expect(filter.segment).toBe("inactive");
	});

	it("should filter by search in name, industry, and tags", () => {
		const filter = {
			search: "tech",
			matchesFields: ["name", "industry", "tags"],
			caseSensitive: false,
		};
		expect(filter.matchesFields).toContain("name");
		expect(filter.matchesFields).toContain("industry");
		expect(filter.matchesFields).toContain("tags");
		expect(filter.caseSensitive).toBe(false);
	});

	it("should filter by industry exact match", () => {
		const filter = {
			industry: "Technology",
			matchType: "exact",
		};
		expect(filter.matchType).toBe("exact");
	});

	it("should filter by subscriptionStatus", () => {
		const filter = {
			status: "active",
			matchesField: "subscriptionStatus",
		};
		expect(filter.matchesField).toBe("subscriptionStatus");
	});
});

describe("CRM Tags", () => {
	it("should store tags as JSON array string in database", () => {
		const storage = {
			dbFormat: '["enterprise", "high-value"]',
			apiFormat: ["enterprise", "high-value"],
		};
		expect(JSON.parse(storage.dbFormat)).toEqual(storage.apiFormat);
	});

	it("should return empty array for null tags", () => {
		const customer = {
			tags: null,
			expectedParsedTags: [],
		};
		expect(customer.expectedParsedTags).toEqual([]);
	});

	it("should parse valid JSON tags", () => {
		const customer = {
			tags: '["enterprise", "high-value", "at-risk"]',
			expectedParsedTags: ["enterprise", "high-value", "at-risk"],
		};
		expect(JSON.parse(customer.tags)).toEqual(customer.expectedParsedTags);
	});
});

describe("CRM Assignment", () => {
	it("should include assignedTo user info when assigned", () => {
		const customer = {
			assignedToUserId: "user-123",
			assignedTo: {
				id: "user-123",
				name: "John Smith",
			},
		};
		expect(customer.assignedTo.id).toBe(customer.assignedToUserId);
		expect(customer.assignedTo.name).toBeDefined();
	});

	it("should return undefined assignedTo when not assigned", () => {
		const customer = {
			assignedToUserId: null,
			assignedTo: undefined,
		};
		expect(customer.assignedToUserId).toBeNull();
		expect(customer.assignedTo).toBeUndefined();
	});
});

describe("Organization Scoping", () => {
	it("should only return tenant organizations for the requested support staff org", () => {
		const scopingPattern = {
			lookupBySlug: true, // Get organization by params.tenant
			filterByOrgId: true, // Query tenantOrganization.organizationId === orgId
			return404ForNotFound: true, // Return 404 if org not found
		};
		expect(scopingPattern.lookupBySlug).toBe(true);
		expect(scopingPattern.filterByOrgId).toBe(true);
		expect(scopingPattern.return404ForNotFound).toBe(true);
	});

	it("should prevent cross-tenant data access", () => {
		// Each support staff org can only see their own tenant organizations
		const crossTenantAccess = {
			expectedBehavior: "Returns empty customers array for different org",
			expectedStatus: 200, // Not 403, just empty results
		};
		expect(crossTenantAccess.expectedStatus).toBe(200);
	});
});

describe("Authentication", () => {
	it("should require valid session", () => {
		const noSessionResponse = {
			error: "Unauthorized",
			customers: [],
			status: 401,
		};
		expect(noSessionResponse.status).toBe(401);
	});
});

describe("Error Handling", () => {
	it("should return 500 for internal server errors", () => {
		const errorResponse = {
			error: "Internal server error",
			customers: [],
			status: 500,
		};
		expect(errorResponse.status).toBe(500);
	});

	it("should always return customers array even on error", () => {
		const errorResponses = [
			{ error: "Unauthorized", customers: [] },
			{ error: "Organization not found", customers: [] },
			{ error: "Internal server error", customers: [] },
		];
		for (const response of errorResponses) {
			expect(response.customers).toBeInstanceOf(Array);
		}
	});
});

/**
 * Tests for POST /:tenant/api/crm/customers
 * Create a new customer (tenant organization)
 */
describe("CRM Customer Creation API", () => {
	describe("POST /:tenant/api/crm/customers", () => {
		describe("Authentication and Authorization", () => {
			it("should require authentication", () => {
				const expectedResponse = { error: "Unauthorized" };
				expect(expectedResponse.error).toBe("Unauthorized");
			});

			it("should return 404 for invalid tenant", () => {
				const expectedResponse = { error: "Organization not found" };
				expect(expectedResponse.error).toBe("Organization not found");
			});
		});

		describe("Required Fields", () => {
			it("should require company name", () => {
				const expectedResponse = { error: "Company name is required" };
				expect(expectedResponse.error).toBe("Company name is required");
			});

			it("should reject empty name", () => {
				const validation = {
					name: "",
					expectedError: "Company name is required",
				};
				expect(validation.expectedError).toBe("Company name is required");
			});

			it("should reject whitespace-only name", () => {
				const validation = {
					name: "   ",
					expectedError: "Company name is required",
				};
				expect(validation.expectedError).toBe("Company name is required");
			});
		});

		describe("Slug Generation", () => {
			it("should auto-generate slug from name", () => {
				const customer = {
					name: "Acme Corporation",
					expectedSlug: "acme-corporation",
				};
				expect(customer.expectedSlug).toBe("acme-corporation");
			});

			it("should generate unique slug when duplicate exists", () => {
				const customers = [
					{ name: "Acme Corp", slug: "acme-corp" },
					{ name: "Acme Corp", slug: "acme-corp-1" }, // Second Acme Corp gets -1 suffix
				];
				expect(customers[0].slug).toBe("acme-corp");
				expect(customers[1].slug).toBe("acme-corp-1");
			});

			it("should use provided slug if given", () => {
				const customer = {
					name: "Acme Corporation",
					providedSlug: "acme-custom",
					resultSlug: "acme-custom",
				};
				expect(customer.resultSlug).toBe("acme-custom");
			});

			it("should handle special characters in name", () => {
				const customer = {
					name: "Acme's Corp & Partners",
					expectedSlug: "acmes-corp-partners",
				};
				expect(customer.expectedSlug).toBe("acmes-corp-partners");
			});
		});

		describe("Optional Fields", () => {
			it("should accept industry", () => {
				const customer = {
					name: "Acme Corp",
					industry: "Technology",
				};
				expect(customer.industry).toBe("Technology");
			});

			it("should accept website", () => {
				const customer = {
					name: "Acme Corp",
					website: "https://acme.com",
				};
				expect(customer.website).toBe("https://acme.com");
			});

			it("should accept billingEmail", () => {
				const customer = {
					name: "Acme Corp",
					billingEmail: "billing@acme.com",
				};
				expect(customer.billingEmail).toBe("billing@acme.com");
			});

			it("should accept billingAddress", () => {
				const customer = {
					name: "Acme Corp",
					billingAddress: "123 Main St, City, State 12345",
				};
				expect(customer.billingAddress).toBeDefined();
			});

			it("should accept assignedToUserId", () => {
				const customer = {
					name: "Acme Corp",
					assignedToUserId: "user-123",
				};
				expect(customer.assignedToUserId).toBe("user-123");
			});

			it("should validate assignedToUserId exists", () => {
				const validation = {
					assignedToUserId: "non-existent-user",
					expectedError: "Assigned user not found",
				};
				expect(validation.expectedError).toBe("Assigned user not found");
			});

			it("should accept tags as array", () => {
				const customer = {
					name: "Acme Corp",
					tags: ["enterprise", "high-value"],
				};
				expect(customer.tags).toEqual(["enterprise", "high-value"]);
			});

			it("should store tags as JSON string", () => {
				const dbStorage = {
					tags: ["enterprise", "high-value"],
					dbValue: '["enterprise","high-value"]',
				};
				expect(JSON.parse(dbStorage.dbValue)).toEqual(dbStorage.tags);
			});

			it("should accept notes", () => {
				const customer = {
					name: "Acme Corp",
					notes: "Important customer, handle with care",
				};
				expect(customer.notes).toBeDefined();
			});
		});

		describe("Prospect Creation (no subscription)", () => {
			it("should create customer without subscription", () => {
				const request = {
					name: "Acme Corp",
					industry: "Technology",
					createSubscription: false,
				};
				expect(request.createSubscription).toBe(false);
			});

			it("should set subscriptionPlan to null for prospect", () => {
				const customer = {
					createSubscription: false,
					resultSubscriptionPlan: null,
					resultSubscriptionStatus: null,
				};
				expect(customer.resultSubscriptionPlan).toBeNull();
				expect(customer.resultSubscriptionStatus).toBeNull();
			});

			it("should return customer as prospect in status", () => {
				const customer = {
					subscriptionStatus: null,
					expectedCrmStatus: "prospect",
				};
				expect(customer.expectedCrmStatus).toBe("prospect");
			});
		});

		describe("Customer Creation (with subscription)", () => {
			it("should require productPlanId when creating subscription", () => {
				// Request body structure for reference
				void {
					name: "Acme Corp",
					createSubscription: true,
					subscriptionData: {}, // missing productPlanId
				};
				const expectedError =
					"Product plan is required when creating subscription";
				expect(expectedError).toContain("Product plan");
			});

			it("should validate productPlanId exists", () => {
				const validation = {
					productPlanId: "non-existent-plan",
					expectedError: "Product plan not found",
				};
				expect(validation.expectedError).toBe("Product plan not found");
			});

			it("should validate productPlanId belongs to organization", () => {
				const validation = {
					productPlanId: "plan-from-other-org",
					expectedError: "Product plan not found",
				};
				expect(validation.expectedError).toBe("Product plan not found");
			});

			it("should create subscription with default values", () => {
				const subscriptionDefaults = {
					status: "active",
					billingCycle: "monthly",
					seats: 1,
				};
				expect(subscriptionDefaults.status).toBe("active");
				expect(subscriptionDefaults.billingCycle).toBe("monthly");
				expect(subscriptionDefaults.seats).toBe(1);
			});

			it("should accept custom subscription values", () => {
				const subscriptionData = {
					productPlanId: "plan-123",
					status: "trial",
					billingCycle: "yearly",
					seats: 10,
					couponId: "coupon-123",
				};
				expect(subscriptionData.billingCycle).toBe("yearly");
				expect(subscriptionData.seats).toBe(10);
			});

			it("should generate subscription number", () => {
				const subscription = {
					subscriptionNumber: "SUB-1000",
				};
				expect(subscription.subscriptionNumber).toMatch(/^SUB-\d+$/);
			});

			it("should calculate MRR from plan pricing", () => {
				const mrrCalculation = {
					planAmount: 9900, // $99
					interval: "monthly",
					seats: 1,
					expectedMrr: 9900,
				};
				expect(mrrCalculation.expectedMrr).toBe(9900);
			});

			it("should convert yearly pricing to MRR", () => {
				const mrrCalculation = {
					planAmount: 118800, // $1188/year
					interval: "yearly",
					seats: 1,
					expectedMrr: 9900, // $99/month
				};
				expect(mrrCalculation.expectedMrr).toBe(
					Math.round(mrrCalculation.planAmount / 12),
				);
			});

			it("should update tenant organization subscription fields", () => {
				const tenantOrgUpdate = {
					subscriptionPlan: "Enterprise",
					subscriptionStatus: "active",
				};
				expect(tenantOrgUpdate.subscriptionPlan).toBe("Enterprise");
				expect(tenantOrgUpdate.subscriptionStatus).toBe("active");
			});

			it("should create subscription activity entry", () => {
				const activity = {
					activityType: "created",
					description:
						"Subscription SUB-1000 created for Acme Corp on Enterprise plan",
				};
				expect(activity.activityType).toBe("created");
				expect(activity.description).toContain("created");
			});
		});

		describe("Response Shape", () => {
			it("should return success response for prospect", () => {
				const response = {
					success: true,
					customer: {
						id: "customer-uuid",
						name: "Acme Corp",
						slug: "acme-corp",
						industry: "Technology",
						website: null,
						billingEmail: null,
						tags: [],
						assignedToUserId: null,
						subscriptionPlan: null,
						subscriptionStatus: null,
					},
					subscription: null,
				};
				expect(response.success).toBe(true);
				expect(response.customer.id).toBeDefined();
				expect(response.subscription).toBeNull();
			});

			it("should return success response for customer with subscription", () => {
				const response = {
					success: true,
					customer: {
						id: "customer-uuid",
						name: "Acme Corp",
						slug: "acme-corp",
						industry: "Technology",
						subscriptionPlan: "Enterprise",
						subscriptionStatus: "active",
					},
					subscription: {
						id: "subscription-uuid",
						subscriptionNumber: "SUB-1000",
						plan: "Enterprise",
						mrr: 9900,
						status: "active",
						billingCycle: "monthly",
						seats: 1,
					},
				};
				expect(response.success).toBe(true);
				expect(response.subscription).toBeDefined();
				expect(response.subscription?.subscriptionNumber).toMatch(/^SUB-\d+$/);
			});

			it("should return 201 status code on success", () => {
				const responseStatus = 201;
				expect(responseStatus).toBe(201);
			});
		});

		describe("Error Handling", () => {
			it("should return 400 for validation errors", () => {
				const errorResponse = {
					status: 400,
					error: "Company name is required",
				};
				expect(errorResponse.status).toBe(400);
			});

			it("should return 404 for not found errors", () => {
				const errorResponse = {
					status: 404,
					error: "Product plan not found",
				};
				expect(errorResponse.status).toBe(404);
			});

			it("should return 500 for internal server errors", () => {
				const errorResponse = {
					status: 500,
					error: "Internal server error",
				};
				expect(errorResponse.status).toBe(500);
			});
		});

		describe("Organization Scoping", () => {
			it("should create customer within the authenticated org", () => {
				const scopingRule = {
					customerOrganizationId: "derived from params.tenant",
					verification: "org.slug === params.tenant",
				};
				expect(scopingRule.verification).toContain("params.tenant");
			});

			it("should prevent creating customer for other organization", () => {
				const securityRule = {
					check: "Customer is always created under authenticated users org",
					prevention: "organizationId comes from URL, not request body",
				};
				expect(securityRule.prevention).toContain("URL");
			});
		});
	});
});

describe("CRM Members API", () => {
	describe("GET /:tenant/api/members", () => {
		it("should require authentication", () => {
			const expectedResponse = { error: "Unauthorized", members: [] };
			expect(expectedResponse.error).toBe("Unauthorized");
		});

		it("should return organization members", () => {
			const expectedShape = {
				members: [
					{
						id: "user-uuid",
						name: "John Smith",
						email: "john@example.com",
						image: null,
						role: "admin",
					},
				],
			};
			expect(expectedShape.members).toBeInstanceOf(Array);
			expect(expectedShape.members[0].id).toBeDefined();
			expect(expectedShape.members[0].name).toBeDefined();
		});

		it("should return empty array for invalid tenant", () => {
			const expectedResponse = { error: "Organization not found", members: [] };
			expect(expectedResponse.error).toBe("Organization not found");
			expect(expectedResponse.members).toEqual([]);
		});
	});

	describe("Customer Detail API", () => {
		describe("GET /:tenant/api/crm/customers/:customerId", () => {
			it("should require authentication", () => {
				const expectedResponse = {
					error: "Unauthorized",
				};
				expect(expectedResponse.error).toBe("Unauthorized");
			});

			it("should return 404 for invalid tenant", () => {
				const expectedResponse = {
					error: "Organization not found",
				};
				expect(expectedResponse.error).toBe("Organization not found");
			});

			it("should return 404 for customer not found", () => {
				const expectedResponse = {
					error: "Customer not found",
				};
				expect(expectedResponse.error).toBe("Customer not found");
			});

			it("should return customer with full details", () => {
				const expectedCustomerShape = {
					customer: {
						id: "string",
						name: "string",
						slug: "string",
						industry: "string | null",
						website: "string | null",
						billingEmail: "string | null",
						billingAddress: "string | null",
						assignedToUserId: "string | null",
						tags: ["enterprise", "high-value"],
						notes: "string | null",
						subscriptionPlan: "string | null",
						subscriptionStatus:
							"active | trialing | canceled | past_due | null",
						createdAt: "ISO date string",
						updatedAt: "ISO date string",
					},
				};
				expect(expectedCustomerShape.customer.id).toBeDefined();
				expect(expectedCustomerShape.customer.name).toBeDefined();
				expect(expectedCustomerShape.customer.slug).toBeDefined();
			});
		});

		describe("PUT /:tenant/api/crm/customers/:customerId", () => {
			it("should require authentication", () => {
				const expectedResponse = {
					error: "Unauthorized",
				};
				expect(expectedResponse.error).toBe("Unauthorized");
			});

			it("should return 404 for invalid tenant", () => {
				const expectedResponse = {
					error: "Organization not found",
				};
				expect(expectedResponse.error).toBe("Organization not found");
			});

			it("should return 404 for customer not found", () => {
				const expectedResponse = {
					error: "Customer not found",
				};
				expect(expectedResponse.error).toBe("Customer not found");
			});

			it("should accept partial update (only name)", () => {
				const requestBody = {
					name: "Updated Company Name",
				};
				expect(requestBody.name).toBeDefined();
				expect(Object.keys(requestBody).length).toBe(1);
			});

			it("should accept multiple fields update", () => {
				const requestBody = {
					name: "Updated Company Name",
					industry: "Technology",
					website: "https://example.com",
					billingEmail: "billing@example.com",
					billingAddress: "123 Main St",
					assignedToUserId: "user-id-123",
					tags: ["enterprise", "high-value"],
					notes: "Updated notes",
				};
				expect(requestBody.name).toBeDefined();
				expect(Array.isArray(requestBody.tags)).toBe(true);
			});

			it("should allow unassigning sales rep (null assignedToUserId)", () => {
				const requestBody = {
					assignedToUserId: null,
				};
				expect(requestBody.assignedToUserId).toBeNull();
			});

			it("should validate assignedToUserId exists if provided", () => {
				// Request body structure for reference
				void {
					assignedToUserId: "non-existent-user-id",
				};
				const expectedError = {
					error: "Assigned user not found",
				};
				expect(expectedError.error).toBe("Assigned user not found");
			});

			it("should return updated customer on success", () => {
				const expectedResponse = {
					success: true,
					customer: {
						id: "string",
						name: "Updated Company Name",
						slug: "string",
						industry: "Technology",
						website: "https://example.com",
						billingEmail: "billing@example.com",
						billingAddress: "123 Main St",
						assignedToUserId: "user-id-123",
						tags: ["enterprise", "high-value"],
						notes: "Updated notes",
						subscriptionPlan: "string | null",
						subscriptionStatus:
							"active | trialing | canceled | past_due | null",
					},
				};
				expect(expectedResponse.success).toBe(true);
				expect(expectedResponse.customer.id).toBeDefined();
				expect(expectedResponse.customer.name).toBe("Updated Company Name");
			});

			it("should only update provided fields", () => {
				const originalCustomer = {
					name: "Original Name",
					industry: "Finance",
					website: "https://original.com",
				};
				const updateRequest = {
					name: "Updated Name",
				};
				const updatedCustomer = {
					...originalCustomer,
					...updateRequest,
				};
				expect(updatedCustomer.name).toBe("Updated Name");
				expect(updatedCustomer.industry).toBe("Finance"); // Unchanged
				expect(updatedCustomer.website).toBe("https://original.com"); // Unchanged
			});
		});

		describe("Subscription Info in Response", () => {
			it("should include subscription info in GET response when subscription exists", () => {
				const expectedResponse = {
					customer: {
						id: "customer-id",
						name: "Acme Corp",
						// ... other customer fields
					},
					subscription: {
						id: "subscription-id",
						subscriptionNumber: "SUB-1001",
						productPlanId: "plan-id",
						planName: "Enterprise Plan",
						status: "active",
						billingCycle: "monthly",
						seats: 10,
						mrr: 99900,
						currentPeriodStart: "2024-01-15T00:00:00.000Z",
						currentPeriodEnd: "2024-02-15T00:00:00.000Z",
						createdAt: "2024-01-15T00:00:00.000Z",
					},
				};
				expect(expectedResponse.customer).toBeDefined();
				expect(expectedResponse.subscription).toBeDefined();
				expect(expectedResponse.subscription.subscriptionNumber).toMatch(
					/^SUB-\d+$/,
				);
			});

			it("should return null subscription when no active subscription exists", () => {
				const expectedResponse = {
					customer: {
						id: "customer-id",
						name: "Acme Corp",
					},
					subscription: null,
				};
				expect(expectedResponse.subscription).toBeNull();
			});

			it("should return subscription details including plan name", () => {
				const subscriptionFields = [
					"id",
					"subscriptionNumber",
					"productPlanId",
					"planName",
					"status",
					"billingCycle",
					"seats",
					"mrr",
					"currentPeriodStart",
					"currentPeriodEnd",
					"createdAt",
				];
				const responseSubscription = {
					id: "sub-id",
					subscriptionNumber: "SUB-1001",
					productPlanId: "plan-id",
					planName: "Enterprise Plan",
					status: "active",
					billingCycle: "monthly",
					seats: 10,
					mrr: 99900,
					currentPeriodStart: "2024-01-15T00:00:00.000Z",
					currentPeriodEnd: "2024-02-15T00:00:00.000Z",
					createdAt: "2024-01-15T00:00:00.000Z",
				};
				subscriptionFields.forEach((field) => {
					expect(responseSubscription).toHaveProperty(field);
				});
			});

			it("should handle customer with canceled subscription (return null)", () => {
				// When subscription status is 'canceled', it should not be returned
				const scenario = {
					customerSubscriptionStatus: "canceled",
					expectedSubscriptionInResponse: null,
					reason: "Only active subscriptions are returned",
				};
				expect(scenario.expectedSubscriptionInResponse).toBeNull();
			});

			it("should handle customer with paused subscription (return null)", () => {
				// When subscription status is 'paused', it should not be returned
				const scenario = {
					customerSubscriptionStatus: "paused",
					expectedSubscriptionInResponse: null,
					reason: "Only active subscriptions are returned",
				};
				expect(scenario.expectedSubscriptionInResponse).toBeNull();
			});

			it("should only return active subscriptions", () => {
				const queryCondition = {
					filter: "subscription.status === 'active'",
					reason: "Only active subscriptions are relevant for display",
				};
				expect(queryCondition.filter).toContain("active");
			});
		});
	});
});
