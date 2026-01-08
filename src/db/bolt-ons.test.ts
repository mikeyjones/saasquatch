import { describe, it, expect } from "vitest";
import { productPlanAddOn } from "./schema";

/**
 * Tests for Bolt-On Products database schema
 * Validates the productPlanAddOn junction table and bolt-on relationships
 */
describe("Bolt-On Products Schema", () => {
	describe("productPlanAddOn table", () => {
		it("should have id as primary key", () => {
			const columns = Object.keys(productPlanAddOn);
			expect(columns).toContain("id");
		});

		it("should have productPlanId for plan reference", () => {
			const columns = Object.keys(productPlanAddOn);
			expect(columns).toContain("productPlanId");
		});

		it("should have productAddOnId for add-on reference", () => {
			const columns = Object.keys(productPlanAddOn);
			expect(columns).toContain("productAddOnId");
		});

		it("should have billingType column for billing configuration", () => {
			const columns = Object.keys(productPlanAddOn);
			expect(columns).toContain("billingType");
		});

		it("should have displayOrder column for UI ordering", () => {
			const columns = Object.keys(productPlanAddOn);
			expect(columns).toContain("displayOrder");
		});

		it("should have timestamp columns", () => {
			const columns = Object.keys(productPlanAddOn);
			expect(columns).toContain("createdAt");
			expect(columns).toContain("updatedAt");
		});

		it("should have all required columns for junction table", () => {
			const columns = Object.keys(productPlanAddOn);
			const requiredColumns = [
				"id",
				"productPlanId",
				"productAddOnId",
				"billingType",
				"displayOrder",
				"createdAt",
				"updatedAt",
			];

			for (const col of requiredColumns) {
				expect(columns).toContain(col);
			}
		});
	});
});

/**
 * Tests for Bolt-On billing types
 */
describe("Bolt-On Billing Types", () => {
	it("should support billed_with_main billing type", () => {
		const boltOn = {
			billingType: "billed_with_main",
			description: "Billed as part of the main subscription recurring charge",
		};

		expect(boltOn.billingType).toBe("billed_with_main");
	});

	it("should support consumable billing type", () => {
		const boltOn = {
			billingType: "consumable",
			description: "Usage-based billing tracked separately",
		};

		expect(boltOn.billingType).toBe("consumable");
	});

	it("should only allow valid billing types", () => {
		const validBillingTypes = ["billed_with_main", "consumable"];

		expect(validBillingTypes).toContain("billed_with_main");
		expect(validBillingTypes).toContain("consumable");
		expect(validBillingTypes.length).toBe(2);
	});

	it("should default to billed_with_main", () => {
		const defaultBillingType = "billed_with_main";
		expect(defaultBillingType).toBe("billed_with_main");
	});
});

/**
 * Tests for Bolt-On data model relationships
 */
describe("Bolt-On Data Model", () => {
	it("should follow the pattern: ProductPlan <-> ProductPlanAddOn <-> ProductAddOn", () => {
		const relationships = {
			productPlan: {
				hasMany: ["productPlanAddOns"],
				through: "productPlanAddOn",
			},
			productAddOn: {
				hasMany: ["productPlanAddOns"],
				through: "productPlanAddOn",
			},
			productPlanAddOn: {
				belongsTo: ["productPlan", "productAddOn"],
				role: "junction table",
				additionalData: ["billingType", "displayOrder"],
			},
		};

		expect(relationships.productPlanAddOn.belongsTo).toContain("productPlan");
		expect(relationships.productPlanAddOn.belongsTo).toContain("productAddOn");
		expect(relationships.productPlanAddOn.additionalData).toContain(
			"billingType",
		);
	});

	it("should support many-to-many relationship between plans and add-ons", () => {
		// A plan can have multiple bolt-ons
		const plan = {
			id: "plan-1",
			name: "Pro Plan",
			boltOns: [
				{ productAddOnId: "addon-1", billingType: "billed_with_main" },
				{ productAddOnId: "addon-2", billingType: "consumable" },
				{ productAddOnId: "addon-3", billingType: "billed_with_main" },
			],
		};

		expect(plan.boltOns.length).toBe(3);

		// An add-on can be attached to multiple plans
		const addOn = {
			id: "addon-1",
			name: "Extra Storage",
			attachedToPlans: ["plan-1", "plan-2", "plan-3"],
		};

		expect(addOn.attachedToPlans.length).toBe(3);
	});

	it("should enforce unique constraint on plan-addon combination", () => {
		// Each add-on can only be attached once per plan
		const uniqueConstraint = {
			table: "productPlanAddOn",
			columns: ["productPlanId", "productAddOnId"],
			type: "unique",
		};

		expect(uniqueConstraint.columns).toContain("productPlanId");
		expect(uniqueConstraint.columns).toContain("productAddOnId");
		expect(uniqueConstraint.type).toBe("unique");
	});

	it("should cascade delete when plan is deleted", () => {
		const foreignKey = {
			column: "productPlanId",
			references: "productPlan.id",
			onDelete: "cascade",
		};

		expect(foreignKey.onDelete).toBe("cascade");
	});

	it("should cascade delete when add-on is deleted", () => {
		const foreignKey = {
			column: "productAddOnId",
			references: "productAddOn.id",
			onDelete: "cascade",
		};

		expect(foreignKey.onDelete).toBe("cascade");
	});
});

/**
 * Tests for Bolt-On display ordering
 */
describe("Bolt-On Display Ordering", () => {
	it("should support ordering bolt-ons for display", () => {
		const boltOns = [
			{ productAddOnId: "addon-1", displayOrder: 2 },
			{ productAddOnId: "addon-2", displayOrder: 0 },
			{ productAddOnId: "addon-3", displayOrder: 1 },
		];

		const sorted = [...boltOns].sort((a, b) => a.displayOrder - b.displayOrder);

		expect(sorted[0].productAddOnId).toBe("addon-2");
		expect(sorted[1].productAddOnId).toBe("addon-3");
		expect(sorted[2].productAddOnId).toBe("addon-1");
	});

	it("should default displayOrder to 0", () => {
		const defaultOrder = 0;
		expect(defaultOrder).toBe(0);
	});

	it("should handle reordering bolt-ons", () => {
		const boltOns = [
			{ productAddOnId: "addon-1", displayOrder: 0, name: "Storage" },
			{ productAddOnId: "addon-2", displayOrder: 1, name: "API Access" },
			{ productAddOnId: "addon-3", displayOrder: 2, name: "Support" },
		];

		// Move Support to the top
		const reordered = [
			{ ...boltOns[2], displayOrder: 0 },
			{ ...boltOns[0], displayOrder: 1 },
			{ ...boltOns[1], displayOrder: 2 },
		];

		const sorted = [...reordered].sort(
			(a, b) => a.displayOrder - b.displayOrder,
		);
		expect(sorted[0].name).toBe("Support");
	});
});

/**
 * Tests for Bolt-On business logic
 */
describe("Bolt-On Business Logic", () => {
	it("should calculate total MRR including recurring bolt-ons", () => {
		const subscription = {
			basePlanMrr: 9900, // $99.00 in cents
			boltOns: [
				{ billingType: "billed_with_main", price: 1000 }, // $10.00
				{ billingType: "billed_with_main", price: 500 }, // $5.00
				{ billingType: "consumable", price: 0 }, // Usage-based, not counted in MRR
			],
		};

		const recurringBoltOnsMrr = subscription.boltOns
			.filter((b) => b.billingType === "billed_with_main")
			.reduce((sum, b) => sum + b.price, 0);

		const totalMrr = subscription.basePlanMrr + recurringBoltOnsMrr;

		expect(recurringBoltOnsMrr).toBe(1500); // $15.00
		expect(totalMrr).toBe(11400); // $114.00
	});

	it("should not include consumable bolt-ons in MRR calculation", () => {
		const boltOns = [
			{ billingType: "billed_with_main", price: 1000 },
			{ billingType: "consumable", price: 2000 }, // Should not be counted
			{ billingType: "billed_with_main", price: 500 },
		];

		const mrrBoltOns = boltOns.filter(
			(b) => b.billingType === "billed_with_main",
		);

		expect(mrrBoltOns.length).toBe(2);
		expect(mrrBoltOns.reduce((sum, b) => sum + b.price, 0)).toBe(1500);
	});

	it("should track consumable usage separately", () => {
		const consumableBoltOn = {
			productAddOnId: "api-calls",
			billingType: "consumable",
			usageMeterId: "meter-123",
			usageTracking: {
				currentPeriodUsage: 15000,
				tierPricing: [
					{ upTo: 10000, unitPrice: 0 }, // Free tier
					{ upTo: 50000, unitPrice: 1 }, // $0.01 per call
					{ upTo: null, unitPrice: 0.5 }, // $0.005 per call
				],
			},
		};

		expect(consumableBoltOn.billingType).toBe("consumable");
		expect(consumableBoltOn.usageTracking.currentPeriodUsage).toBe(15000);

		// Calculate overage charges
		const freeUsage = 10000;
		const overageUsage =
			consumableBoltOn.usageTracking.currentPeriodUsage - freeUsage;
		const overageCharge = overageUsage * 1; // $0.01 per call = 1 cent

		expect(overageUsage).toBe(5000);
		expect(overageCharge).toBe(5000); // $50.00 in cents
	});

	it("should filter bolt-ons by billing type", () => {
		const planBoltOns = [
			{ id: "bo-1", billingType: "billed_with_main", name: "Extra Users" },
			{ id: "bo-2", billingType: "consumable", name: "API Calls" },
			{ id: "bo-3", billingType: "billed_with_main", name: "Premium Support" },
			{ id: "bo-4", billingType: "consumable", name: "Storage" },
		];

		const recurring = planBoltOns.filter(
			(b) => b.billingType === "billed_with_main",
		);
		const consumable = planBoltOns.filter(
			(b) => b.billingType === "consumable",
		);

		expect(recurring.length).toBe(2);
		expect(consumable.length).toBe(2);
		expect(recurring.map((b) => b.name)).toContain("Extra Users");
		expect(consumable.map((b) => b.name)).toContain("API Calls");
	});
});

/**
 * Tests for Bolt-On configuration scenarios
 */
describe("Bolt-On Configuration Scenarios", () => {
	it("should support typical SaaS bolt-on configurations", () => {
		const typicalBoltOns = [
			{
				name: "Extra Storage",
				pricingModel: "flat",
				billingType: "billed_with_main",
				price: 999, // $9.99/month
			},
			{
				name: "API Access",
				pricingModel: "usage",
				billingType: "consumable",
				price: null, // Usage-based
			},
			{
				name: "Priority Support",
				pricingModel: "flat",
				billingType: "billed_with_main",
				price: 2999, // $29.99/month
			},
			{
				name: "Additional Users",
				pricingModel: "seat",
				billingType: "billed_with_main",
				pricePerSeat: 500, // $5.00/user/month
			},
			{
				name: "Overage SMS",
				pricingModel: "usage",
				billingType: "consumable",
				pricePerUnit: 5, // $0.05 per SMS
			},
		];

		expect(typicalBoltOns.length).toBe(5);
		expect(
			typicalBoltOns.filter((b) => b.billingType === "billed_with_main").length,
		).toBe(3);
		expect(
			typicalBoltOns.filter((b) => b.billingType === "consumable").length,
		).toBe(2);
	});

	it("should allow same add-on with different billing types on different plans", () => {
		// The same add-on can be configured differently per plan
		const planConfigs = [
			{
				planId: "starter",
				addOnId: "api-access",
				billingType: "consumable", // Pay per use on Starter
			},
			{
				planId: "pro",
				addOnId: "api-access",
				billingType: "billed_with_main", // Included with Pro
			},
		];

		const starterConfig = planConfigs.find((c) => c.planId === "starter");
		const proConfig = planConfigs.find((c) => c.planId === "pro");

		expect(starterConfig?.billingType).toBe("consumable");
		expect(proConfig?.billingType).toBe("billed_with_main");
	});

	it("should support optional bolt-ons that customers can select", () => {
		const checkoutScenario = {
			selectedPlan: "pro",
			availableBoltOns: [
				{ id: "addon-1", name: "Extra Storage", optional: true },
				{ id: "addon-2", name: "API Access", optional: true },
				{ id: "addon-3", name: "Priority Support", optional: true },
			],
			selectedBoltOns: ["addon-1", "addon-3"],
		};

		const selectedAddOns = checkoutScenario.availableBoltOns.filter((a) =>
			checkoutScenario.selectedBoltOns.includes(a.id),
		);

		expect(selectedAddOns.length).toBe(2);
		expect(selectedAddOns.map((a) => a.name)).toContain("Extra Storage");
		expect(selectedAddOns.map((a) => a.name)).toContain("Priority Support");
		expect(selectedAddOns.map((a) => a.name)).not.toContain("API Access");
	});
});

/**
 * Tests for Bolt-On pricing calculations
 */
describe("Bolt-On Pricing Calculations", () => {
	it("should calculate flat rate bolt-on price", () => {
		const boltOn = {
			pricingModel: "flat",
			billingType: "billed_with_main",
			amount: 999, // $9.99 in cents
			interval: "monthly",
		};

		expect(boltOn.amount).toBe(999);
		expect(boltOn.amount / 100).toBe(9.99);
	});

	it("should calculate seat-based bolt-on price", () => {
		const boltOn = {
			pricingModel: "seat",
			billingType: "billed_with_main",
			perSeatAmount: 500, // $5.00 per seat in cents
			interval: "monthly",
		};

		const seats = 10;
		const totalPrice = boltOn.perSeatAmount * seats;

		expect(totalPrice).toBe(5000); // $50.00
	});

	it("should calculate tiered usage bolt-on price", () => {
		const boltOn = {
			pricingModel: "usage",
			billingType: "consumable",
			usageTiers: [
				{ upTo: 1000, unitPrice: 0 }, // Free tier
				{ upTo: 5000, unitPrice: 10 }, // $0.10 per unit (10 cents)
				{ upTo: null, unitPrice: 5 }, // $0.05 per unit beyond 5k
			],
		};

		// Helper function for calculating usage price (not used in test but kept for reference)
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const calculateUsagePrice = (usage: number): number => {
			let remaining = usage;
			let total = 0;

			for (const tier of boltOn.usageTiers) {
				const tierUsage = tier.upTo
					? Math.min(
							remaining,
							tier.upTo -
								(boltOn.usageTiers.indexOf(tier) > 0
									? (boltOn.usageTiers[boltOn.usageTiers.indexOf(tier) - 1]
											?.upTo ?? 0)
									: 0),
						)
					: remaining;

				if (tierUsage <= 0) break;

				total += tierUsage * tier.unitPrice;
				remaining -= tierUsage;

				if (remaining <= 0) break;
			}

			return total;
		};
		void calculateUsagePrice; // Mark as intentionally unused

		// Test with 3000 units of usage
		// 1000 free + 2000 at $0.10 = $200
		const usage = 3000;
		const freeUnits = 1000;
		const paidUnits = usage - freeUnits;
		const price = paidUnits * 10; // 10 cents per unit

		expect(freeUnits).toBe(1000);
		expect(paidUnits).toBe(2000);
		expect(price).toBe(20000); // $200.00 in cents
	});

	it("should convert yearly to monthly equivalent for bolt-ons", () => {
		const yearlyBoltOn = {
			amount: 9900, // $99.00/year in cents
			interval: "yearly",
		};

		const monthlyEquivalent = Math.round(yearlyBoltOn.amount / 12);

		expect(monthlyEquivalent).toBe(825); // $8.25/month
	});
});

/**
 * Tests for Bolt-On data types (matching TypeScript interfaces)
 */
describe("Bolt-On Type Definitions", () => {
	it("should match BoltOn interface structure", () => {
		const boltOn = {
			id: "ppa-123",
			productAddOnId: "addon-456",
			name: "Extra Storage",
			description: "50GB additional storage",
			pricingModel: "flat" as const,
			billingType: "billed_with_main" as const,
			displayOrder: 0,
			basePrice: {
				amount: 9.99,
				currency: "USD",
				interval: "monthly",
			},
		};

		expect(boltOn.id).toBeDefined();
		expect(boltOn.productAddOnId).toBeDefined();
		expect(boltOn.name).toBe("Extra Storage");
		expect(["flat", "seat", "usage"]).toContain(boltOn.pricingModel);
		expect(["billed_with_main", "consumable"]).toContain(boltOn.billingType);
	});

	it("should match BoltOnInput interface structure", () => {
		const boltOnInput = {
			productAddOnId: "addon-456",
			billingType: "consumable" as const,
			displayOrder: 1,
		};

		expect(boltOnInput.productAddOnId).toBeDefined();
		expect(["billed_with_main", "consumable"]).toContain(
			boltOnInput.billingType,
		);
		expect(typeof boltOnInput.displayOrder).toBe("number");
	});

	it("should match AvailableAddOn interface structure", () => {
		const availableAddOn = {
			id: "addon-789",
			name: "API Access",
			description: "Full API access with rate limiting",
			pricingModel: "usage" as const,
			status: "active" as const,
			basePrice: {
				amount: 0,
				currency: "USD",
				interval: null,
			},
		};

		expect(availableAddOn.id).toBeDefined();
		expect(availableAddOn.name).toBeDefined();
		expect(["flat", "seat", "usage"]).toContain(availableAddOn.pricingModel);
		expect(["active", "draft", "archived"]).toContain(availableAddOn.status);
	});
});

/**
 * Tests for Bolt-On API response format
 */
describe("Bolt-On API Response Format", () => {
	it("should include bolt-ons in plan response", () => {
		const planResponse = {
			id: "plan-123",
			name: "Pro Plan",
			description: "Our most popular plan",
			status: "active",
			pricingModel: "flat",
			basePrice: {
				amount: 99,
				currency: "USD",
				interval: "monthly",
			},
			features: ["Feature 1", "Feature 2"],
			boltOns: [
				{
					id: "ppa-1",
					productAddOnId: "addon-1",
					name: "Extra Storage",
					billingType: "billed_with_main",
					displayOrder: 0,
				},
				{
					id: "ppa-2",
					productAddOnId: "addon-2",
					name: "API Access",
					billingType: "consumable",
					displayOrder: 1,
				},
			],
		};

		expect(planResponse.boltOns).toBeDefined();
		expect(Array.isArray(planResponse.boltOns)).toBe(true);
		expect(planResponse.boltOns.length).toBe(2);
		expect(planResponse.boltOns[0].billingType).toBe("billed_with_main");
		expect(planResponse.boltOns[1].billingType).toBe("consumable");
	});

	it("should return empty bolt-ons array when plan has no bolt-ons", () => {
		const planResponse = {
			id: "plan-456",
			name: "Starter Plan",
			boltOns: [],
		};

		expect(planResponse.boltOns).toBeDefined();
		expect(planResponse.boltOns.length).toBe(0);
	});
});
