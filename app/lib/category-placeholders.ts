/**
 * Category-specific placeholder text for listing descriptions.
 * Provides contextually relevant examples based on the selected category.
 */

import type { Category } from "./category-config";

/**
 * Description placeholders for each category, tailored to South African context.
 */
export const CATEGORY_DESCRIPTION_PLACEHOLDERS: Record<Category, string> = {
	Electronics:
		"Working perfectly, includes charger and original box. Battery holds charge well, screen has no scratches...",
	"Home & Garden":
		"Bought last year, barely used. Great for small gardens or balconies. Includes all accessories...",
	Fashion:
		"Size M, worn twice. No stains or tears. From a smoke-free home. Retail price was R1200...",
	Skills:
		"Certified electrician with 5 years experience. Can handle residential and small commercial jobs. Available weekends...",
	Vehicles:
		"2019 model, 45000km on the clock. Full service history available. Minor scratch on bumper...",
	Sports:
		"Used for one season. Good condition, suitable for intermediate level. Includes carrying bag...",
	Books:
		"Hardcover, first edition. Pages are clean with no highlights or notes. Minor wear on dust jacket...",
	Services:
		"Professional cleaning services for homes and offices. Eco-friendly products used. References available on request...",
};

/**
 * Placeholder for when no category is selected.
 */
export const DEFAULT_DESCRIPTION_PLACEHOLDER =
	"Describe your item or service in detail — condition, age, included accessories, experience...";

/**
 * Title placeholders for each category.
 */
export const CATEGORY_TITLE_PLACEHOLDERS: Record<Category, string> = {
	Electronics: "e.g. Samsung Galaxy S24 Ultra",
	"Home & Garden": "e.g. Bosch Lawn Mower",
	Fashion: "e.g. Levi's Denim Jacket Size M",
	Skills: "e.g. Plumbing Services",
	Vehicles: "e.g. Toyota Corolla 2019",
	Sports: "e.g. Wilson Tennis Racket",
	Books: "e.g. The Lean Startup Hardcover",
	Services: "e.g. Home Cleaning Services",
};

/**
 * Seeking placeholders based on category type.
 */
export const CATEGORY_SEEKING_PLACEHOLDERS: Record<Category, string> = {
	Electronics:
		"Looking for a laptop, gaming console, or similar tech items...",
	"Home & Garden":
		"Looking for garden tools, furniture, or home appliances...",
	Fashion: "Looking for clothing, shoes, or accessories in size M/L...",
	Skills: "Looking for tutoring, repairs, or professional services...",
	Vehicles: "Looking for car parts, bicycle, or scooter...",
	Sports: "Looking for gym equipment, sports gear, or activewear...",
	Books: "Looking for fiction, textbooks, or children's books...",
	Services:
		"Looking for home services, tech support, or professional assistance...",
};
