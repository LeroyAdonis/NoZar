export type FulfillmentType = "digital" | "meetup" | "courier";

export function determineFulfillment(
  listingCategory: string,
  initiatorCity: string,
  responderCity: string
): FulfillmentType {
  // 1. Digital Goods (Placeholder logic: assume electronics or virtual items might be digital)
  // In a real app, this would be a more robust categorization.
  if (["software", "digital", "vouchers"].includes(listingCategory.toLowerCase())) {
    return "digital";
  }

  // 2. Local Meetup
  if (initiatorCity.toLowerCase() === responderCity.toLowerCase()) {
    return "meetup";
  }

  // 3. Long Distance
  return "courier";
}
