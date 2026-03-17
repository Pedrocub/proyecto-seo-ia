import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { generateColdEmail } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, businessName, contactName, overallGrade, overallScore, totalIssues, criticalCount, auditUrl } = body;

    if (!to || !businessName || !auditUrl) {
      return NextResponse.json(
        { error: "to, businessName, y auditUrl son requeridos" },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM;
    const smtpFromName = process.env.SMTP_FROM_NAME || "Liderify";

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      return NextResponse.json(
        { error: "SMTP no configurado. Configura las variables de entorno SMTP_*" },
        { status: 500 }
      );
    }

    // Generate email content
    const email = generateColdEmail({
      businessName,
      contactName,
      overallGrade: overallGrade || "D",
      overallScore: overallScore || 50,
      totalIssues: totalIssues || 0,
      criticalCount: criticalCount || 0,
      auditUrl,
      senderName: smtpFromName,
    });

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFrom}>`,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      subject: email.subject,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error enviando email", details: String(error) },
      { status: 500 }
    );
  }
}
