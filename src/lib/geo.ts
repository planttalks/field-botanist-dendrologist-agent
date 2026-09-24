export function missingPointCopy(code: number): { title: string; detail: string } {
  if (code === 1) {
    return {
      title: "The point is missing",
      detail: "Location permission was denied. Continue without a point. Nothing will be filled in.",
    }
  }
  if (code === 3) {
    return {
      title: "The point is missing",
      detail: "Location timed out. Continue without a point. Nothing will be filled in.",
    }
  }
  return {
    title: "The point is missing",
    detail: "This phone did not return a location. Continue without a point. Nothing will be filled in.",
  }
}
