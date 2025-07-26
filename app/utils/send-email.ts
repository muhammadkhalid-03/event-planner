export async function sendEmail(data: {
  plan: string;
  email: string;
}): Promise<void> {
  const apiEndpoint = "/api/email/";

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan: data.plan, email: data.email }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(result.message);
    alert(result.message);
  } catch (error) {
    console.error("Error sending email:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    alert(`Failed to send email: ${errorMessage}`);
    throw error; // Re-throw so the calling function can handle it
  }
}
