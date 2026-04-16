/**
 * Category configuration for NoZar listings.
 * Defines all available categories with their associated icons and metadata.
 */

import {
	BookOpen,
	Briefcase,
	Car,
	Dumbbell,
	Home,
	Laptop,
	Shirt,
	GraduationCap,
	Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * All available listing categories.
 */
export const CATEGORIES = [
	"Electronics",
	"Home & Garden",
	"Fashion",
	"Skills",
	"Vehicles",
	"Sports",
	"Books",
	"Services",
] as const;

/**
 * Category type derived from the CATEGORIES array.
 */
export type Category = (typeof CATEGORIES)[number];

/**
 * Configuration for a single category, including icon and display properties.
 */
export interface CategoryConfig {
	/** Unique identifier matching the category name */
	id: Category;
	/** Display label for the category */
	label: Category;
	/** Lucide icon component to display */
	icon: LucideIcon;
	/** Optional short description for accessibility */
	description: string;
}

/**
 * Complete category configurations with icons and metadata.
 */
export const CATEGORY_CONFIGS: CategoryConfig[] = [
	{
		id: "Electronics",
		label: "Electronics",
		icon: Laptop,
		description: "Phones, laptops, tablets, and other electronic devices",
	},
	{
		id: "Home & Garden",
		label: "Home & Garden",
		icon: Home,
		description: "Furniture, appliances, and garden equipment",
	},
	{
		id: "Fashion",
		label: "Fashion",
		icon: Shirt,
		description: "Clothing, shoes, and accessories",
	},
	{
		id: "Skills",
		label: "Skills",
		icon: Wrench,
		description: "Professional skills and trade services",
	},
	{
		id: "Vehicles",
		label: "Vehicles",
		icon: Car,
		description: "Cars, motorcycles, and bicycles",
	},
	{
		id: "Sports",
		label: "Sports",
		icon: Dumbbell,
		description: "Sports equipment and fitness gear",
	},
	{
		id: "Books",
		label: "Books",
		icon: BookOpen,
		description: "Books, magazines, and educational materials",
	},
	{
		id: "Services",
		label: "Services",
		icon: Briefcase,
		description: "Professional and personal services",
	},
];

/**
 * Get a category configuration by ID.
 */
export function getCategoryConfig(categoryId: Category): CategoryConfig {
	return CATEGORY_CONFIGS.find((c) => c.id === categoryId)!;
}

/**
 * Check if a string is a valid category.
 */
export function isValidCategory(value: string): value is Category {
	return CATEGORIES.includes(value as Category);
}
