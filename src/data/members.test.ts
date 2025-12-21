import { describe, it, expect } from 'vitest'
import { members, getInitials } from './members'

describe('members data', () => {
  it('should have 4 members', () => {
    expect(members).toHaveLength(4)
  })

  it('should have correct member structure', () => {
    const member = members[0]
    expect(member).toHaveProperty('id')
    expect(member).toHaveProperty('name')
    expect(member).toHaveProperty('email')
    expect(member).toHaveProperty('organization')
    expect(member).toHaveProperty('role')
    expect(member).toHaveProperty('status')
  })

  it('should include John Doe from Acme Corp', () => {
    const john = members.find((m) => m.name === 'John Doe')
    expect(john).toBeDefined()
    expect(john?.organization).toBe('Acme Corp')
    expect(john?.role).toBe('Admin')
  })
})

describe('getInitials', () => {
  it('should generate initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('should handle single name', () => {
    expect(getInitials('John')).toBe('J')
  })

  it('should handle multiple words', () => {
    expect(getInitials('John Michael Doe')).toBe('JM')
  })

  it('should uppercase initials', () => {
    expect(getInitials('john doe')).toBe('JD')
  })

  it('should handle empty string', () => {
    expect(getInitials('')).toBe('')
  })

  it('should limit to 2 characters', () => {
    expect(getInitials('John Michael David Smith')).toBe('JM')
  })
})

