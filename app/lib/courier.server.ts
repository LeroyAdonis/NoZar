export const COURIER_PROVIDERS = [
  { id: "pudo", name: "Pudo Locker" },
  { id: "paxi", name: "Paxi Point" },
];

export async function getCourierPoints(provider: string, city: string) {
  // Placeholder: In real implementation, this would call the Courier API
  return [
    { id: "1", name: "Pudo Locker - Malmesbury Mall", address: "12 Main Rd" },
    { id: "2", name: "Pudo Locker - Checkers", address: "45 Station St" },
  ];
}
