/**
 * VisualCategorySelector - Icon-based category selection component.
 *
 * Replaces text-heavy dropdowns with a mobile-friendly grid of category cards.
 * Each card displays an icon and label, with touch-optimized tap targets.
 *
 * Features:
 * - 4-column grid layout (responsive: 2 cols on very small screens)
 * - Large touch targets (min 64px)
 * - Emerald highlight for selected state
 * - Full keyboard accessibility with arrow key navigation
 * - ARIA attributes for screen reader support
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Check } from "lucide-react";
import { CATEGORIES, type Category } from "~/lib/category-config";
import { cn } from "~/lib/utils";

/**
 * Props for the VisualCategorySelector component.
 */
interface VisualCategorySelectorProps {
	/** Currently selected category */
	value: Category | "";
	/** Callback when a category is selected */
	onChange: (category: Category) => void;
	/** Optional additional CSS classes */
	className?: string;
	/** Whether the selector is disabled */
	disabled?: boolean;
	/** ID for the form input */
	id?: string;
	/** Name for the form input */
	name?: string;
	/** Whether the field has an error */
	error?: boolean;
}

/**
 * Category card component with icon and label.
 */
interface CategoryCardProps {
	category: Category;
	isSelected: boolean;
	onSelect: (category: Category) => void;
	disabled: boolean;
	buttonRef: React.RefObject<HTMLButtonElement>;
}

/**
 * Individual category card in the selector grid.
 */
function CategoryCard({
	category,
	isSelected,
	onSelect,
	disabled,
	buttonRef,
}: CategoryCardProps) {
	// Get icon component based on category - dynamic import would be cleaner but static mapping is simpler
	const icons: Record<Category, React.ComponentType<{ className?: string }>> = {
		Electronics: ({ className }) => (
			<svg
				className={className}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			>
				<rect width="18" height="12" x="3" y="4" rx="2" ry="2" />
				<line x1="2" x2="22" y1="20" y2="20" />
			</svg>
		),
		"Home & Garden": ({ className }) => (
			<svg
				className={className}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			>
				<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
				<polyline points="9,22 9,12 15,12 15,22" />
			</svg>
		),
		Fashion: ({ className }) => (
			<svg
				className={className}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			>
				<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
			</svg>
		),
		Skills: ({ className }) => (
			<svg
				className={className}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			>
				<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
			</svg>
		),
		Vehicles: ({ className }) => (
			<svg
				className={className}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			>
				<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.5-.4-1-1-1h-1l-2-4H7L5 12H4c-.6 0-1 .5-1 1v3c0 .6.4 1 1 1h2" />
				<circle cx="7" cy="17" r="2" />
				<circle cx="17" cy="17" r="2" />
			</svg>
		),
		Sports: ({ className }) => (
			<svg
				className={className}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			>
				<path d="m6.5 6.5 11 11" />
				<path d="m21 21-1-1" />
				<path d="m3 3 1 1" />
				<path d="m18 22-4-4" />
				<path d="m2 6 4 4" />
				<path d="m3 10 7-7" />
				<path d="m14 21 7-7" />
			</svg>
		),
		Books: ({ className }) => (
			<svg
				className={className}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			>
				<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
				<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
			</svg>
		),
		Services: ({ className }) => (
			<svg
				className={className}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			>
				<rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
				<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
			</svg>
		),
	};

	const IconComponent = icons[category];

	return (
		<button
			ref={buttonRef}
			type="button"
			onClick={() => onSelect(category)}
			disabled={disabled}
			aria-pressed={isSelected}
			aria-label={`${category}${isSelected ? ", selected" : ""}`}
			className={cn(
				// Base styles
				"flex flex-col items-center justify-center gap-1.5",
				"rounded-xl p-3 min-h-[72px] transition-all duration-200",
				// Touch target sizing
				"touch-manipulation",
				// Focus styles
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712]",
				// Disabled state
				"disabled:opacity-50 disabled:cursor-not-allowed",
				// Selected vs unselected states
				isSelected
					? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
					: "bg-[#0F172A] border border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
			)}
		>
			{/* Icon container with checkmark overlay for selected state */}
			<div className="relative">
				<IconComponent
					className={cn(
						"w-6 h-6 transition-colors",
						isSelected ? "text-emerald-400" : "text-slate-400"
					)}
				/>
				{isSelected && (
					<Check className="absolute -top-1 -right-1 w-3 h-3 text-emerald-400 bg-emerald-500/20 rounded-full" />
				)}
			</div>

			{/* Category label */}
			<span
				className={cn(
					"text-[10px] font-mono uppercase tracking-wider leading-tight text-center",
					isSelected ? "text-emerald-300" : "text-slate-500"
				)}
			>
				{category === "Home & Garden" ? (
					<>
						Home &
						<br />
						Garden
					</>
				) : category}
			</span>
		</button>
	);
}

/**
 * Visual category selector with grid layout and icon cards.
 */
export function VisualCategorySelector({
	value,
	onChange,
	className,
	disabled = false,
	id = "category",
	name = "category",
	error = false,
}: VisualCategorySelectorProps) {
	// Track focused category for keyboard navigation
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);
	const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (disabled) return;

			const columns = 4; // Grid columns
			const totalItems = CATEGORIES.length;

			switch (e.key) {
				case "ArrowRight":
					e.preventDefault();
					setFocusedIndex((prev) => {
						const next = prev < 0 ? 0 : (prev + 1) % totalItems;
						return next;
					});
					break;
				case "ArrowLeft":
					e.preventDefault();
					setFocusedIndex((prev) => {
						const next = prev < 0 ? totalItems - 1 : (prev - 1 + totalItems) % totalItems;
						return next;
					});
					break;
				case "ArrowDown":
					e.preventDefault();
					setFocusedIndex((prev) => {
						const next = prev < 0 ? 0 : (prev + columns) % totalItems;
						// Handle edge case where we'd go beyond the last item
						return next >= totalItems ? prev : next;
					});
					break;
				case "ArrowUp":
					e.preventDefault();
					setFocusedIndex((prev) => {
						const next = prev - columns;
						// Handle edge case where we'd go before the first item
						return next < 0 ? prev : next;
					});
					break;
				case "Enter":
				case " ":
					e.preventDefault();
					if (focusedIndex >= 0) {
						onChange(CATEGORIES[focusedIndex]);
					}
					break;
				case "Home":
					e.preventDefault();
					setFocusedIndex(0);
					break;
				case "End":
					e.preventDefault();
					setFocusedIndex(totalItems - 1);
					break;
			}
		},
		[disabled, focusedIndex, onChange]
	);

	// Focus the button when focusedIndex changes
	useEffect(() => {
		if (focusedIndex >= 0 && buttonRefs.current[focusedIndex]) {
			buttonRefs.current[focusedIndex]?.focus();
		}
	}, [focusedIndex]);

	// Handle category selection
	const handleSelect = useCallback(
		(category: Category) => {
			onChange(category);
			// Update focused index to match selection
			const index = CATEGORIES.indexOf(category);
			setFocusedIndex(index);
		},
		[onChange]
	);

	return (
		<div className={cn("space-y-1.5", className)}>
			{/* Hidden input for form submission */}
			<input type="hidden" id={id} name={name} value={value} />

			{/* Visible grid selector */}
			<div
				ref={containerRef}
				role="radiogroup"
				aria-label="Select a category"
				aria-required="true"
				aria-invalid={error}
				onKeyDown={handleKeyDown}
				className={cn(
					"grid grid-cols-4 gap-2",
					// Smaller screens: 2 columns
					"sm:grid-cols-4",
					error && "ring-2 ring-red-500/50 rounded-xl p-1 -m-1"
				)}
			>
				{CATEGORIES.map((category, index) => (
					<CategoryCard
						key={category}
						category={category}
						isSelected={value === category}
						onSelect={handleSelect}
						disabled={disabled}
						buttonRef={{
							current: buttonRefs.current[index],
						} as React.RefObject<HTMLButtonElement>}
					/>
				))}
			</div>

			{/* Error message container (handled by parent) */}
		</div>
	);
}

export default VisualCategorySelector;
