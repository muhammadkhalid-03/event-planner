import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { plan, email } = await request.json();

    if (!plan || !email) {
      return NextResponse.json(
        { success: false, error: "Plan and email are required" },
        { status: 400 }
      );
    }

    console.log(`📧 Sending email to: ${email}`);

    // For now, we'll simulate email sending
    // In a real implementation, you would integrate with a service like SendGrid, Mailgun, etc.
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("✅ Email sent successfully (simulated)");
    console.log("📄 Plan content:", plan.substring(0, 100) + "...");

    return NextResponse.json({
      success: true,
      message: "Email sent successfully!",
    });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send email. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 