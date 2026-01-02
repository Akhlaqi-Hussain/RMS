export async function getCurrentUser() {
  try {
    const response = await fetch("/api/auth", {
      method: "GET",
      credentials: "include", // Important for sending cookies
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Prevent caching of user data
    });

    if (!response.ok) {
      // If unauthorized, return null instead of throwing
      if (response.status === 401) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
