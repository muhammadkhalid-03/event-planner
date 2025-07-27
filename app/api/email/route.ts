// import { type NextRequest, NextResponse } from "next/server";
// import nodemailer from "nodemailer";
// import Mail from "nodemailer/lib/mailer";

// export async function POST(request: NextRequest) {
//   const { plan, email } = await request.json();

//   const transport = nodemailer.createTransport({
//     service: "gmail",
//     /*
//       setting service as 'gmail' is same as providing these setings:
//       host: "smtp.gmail.com",
//       port: 465,
//       secure: true
//       If you want to use a different email provider other than gmail, you need to provide these manually.
//       Or you can go use these well known services and their settings at
//       https://github.com/nodemailer/nodemailer/blob/master/lib/well-known/services.json
//   */
//     auth: {
//       user: process.env.EMAIL,
//       pass: process.env.PASSWORD,
//     },
//   });

//   const mailOptions: Mail.Options = {
//     from: process.env.EMAIL,
//     to: email,
//     // cc: email, (uncomment this line if you want to send a copy to the sender)
//     subject: `Event Plan`,
//     text: plan,
//   };

//   const sendMailPromise = () =>
//     new Promise<string>((resolve, reject) => {
//       transport.sendMail(mailOptions, function (err: any) {
//         if (!err) {
//           resolve("Email sent");
//         } else {
//           reject(err.message);
//         }
//       });
//     });

//   try {
//     await sendMailPromise();
//     return NextResponse.json({ message: "Email sent" });
//   } catch (err) {
//     return NextResponse.json({ error: err }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

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

    // Initialize Resend with API key from environment variable
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev", // Use a verified domain
      to: [email],
      subject: "Your Event Plan",
      html: `
        <div>
          <h2>Your Event Plan</h2>
          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${plan}</pre>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to send email" },
        { status: 500 }
      );
    }

    console.log("✅ Email sent successfully:", data);

    return NextResponse.json({
      success: true,
      message: "Email sent successfully!",
      emailId: data?.id,
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
