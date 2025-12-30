import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes.
 * 
 * Combines clsx for conditional classes and tailwind-merge to resolve
 * conflicting Tailwind classes intelligently.
 * 
 * @param inputs - Class values to merge (strings, objects, arrays)
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
