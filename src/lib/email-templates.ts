export function generateColdEmail(params: {
  businessName: string;
  contactName?: string;
  overallGrade: string;
  overallScore: number;
  totalIssues: number;
  criticalCount: number;
  auditUrl: string;
  senderName: string;
}): { subject: string; html: string; text: string } {
  const { businessName, contactName, overallGrade, overallScore, totalIssues, criticalCount, auditUrl, senderName } = params;

  const greeting = contactName ? `Hola ${contactName.split(" ")[0]}` : "Hola";

  const subject = `${businessName}: Tu web tiene nota ${overallGrade} en visibilidad AI`;

  const gradeColor =
    overallGrade === "A" ? "#22c55e" :
    overallGrade === "B" ? "#27ab83" :
    overallGrade === "C" ? "#eab308" :
    overallGrade === "D" ? "#f97316" : "#ef4444";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#faf8f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#102a43,#0c2d2d);padding:30px;text-align:center;">
        <h1 style="color:#ffffff;font-size:24px;margin:0;">Diagnóstico Digital</h1>
        <p style="color:#27ab83;font-size:14px;margin:8px 0 0;">Auditoría de Visibilidad AI</p>
      </td>
    </tr>

    <!-- Grade badge -->
    <tr>
      <td style="text-align:center;padding:30px 20px 10px;">
        <div style="display:inline-block;background-color:${gradeColor};color:#ffffff;font-size:48px;font-weight:bold;width:80px;height:80px;line-height:80px;border-radius:16px;">
          ${overallGrade}
        </div>
        <p style="color:#627d98;font-size:14px;margin:8px 0 0;">Nota General: ${overallScore}/100</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:20px 30px;">
        <p style="color:#243b53;font-size:16px;line-height:1.6;">
          ${greeting},
        </p>
        <p style="color:#243b53;font-size:16px;line-height:1.6;">
          He analizado la web de <strong>${businessName}</strong> y he encontrado
          <strong style="color:${gradeColor};">${totalIssues} problemas</strong> que están afectando tu
          visibilidad en buscadores e inteligencia artificial.
        </p>
        ${criticalCount > 0 ? `
        <p style="color:#243b53;font-size:16px;line-height:1.6;">
          De estos, <strong style="color:#ef4444;">${criticalCount} son críticos</strong> y requieren atención inmediata
          — incluyen problemas que impiden que asistentes de IA como ChatGPT o Gemini
          recomienden tu negocio.
        </p>
        ` : ""}
        <p style="color:#243b53;font-size:16px;line-height:1.6;">
          He preparado un reporte completo y personalizado con todas las áreas analizadas:
        </p>
      </td>
    </tr>

    <!-- Categories preview -->
    <tr>
      <td style="padding:0 30px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
          ${["📱 Mobile", "🔍 SEO", "🤖 IA", "♿ Accesibilidad", "⚡ Rendimiento", "📄 Contenido", "🛡️ Confianza", "⚙️ Técnico"].map(cat => `
          <tr>
            <td style="padding:6px 0;color:#486581;font-size:14px;">${cat}</td>
            <td style="padding:6px 0;text-align:right;color:${gradeColor};font-size:14px;font-weight:bold;">Analizado</td>
          </tr>
          `).join("")}
        </table>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding:10px 30px 30px;text-align:center;">
        <a href="${auditUrl}" style="display:inline-block;background-color:#199473;color:#ffffff;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Ver Mi Reporte Completo
        </a>
      </td>
    </tr>

    <!-- Separator -->
    <tr>
      <td style="padding:0 30px;">
        <hr style="border:none;border-top:1px solid #e8dcc8;">
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:20px 30px;text-align:center;">
        <p style="color:#627d98;font-size:13px;line-height:1.5;">
          Si quieres que te ayude a mejorar estas puntuaciones, responde a este email o
          <a href="https://app.reclaim.ai/m/liderify/consulta" style="color:#199473;">agenda una consulta gratuita</a>.
        </p>
        <p style="color:#9fb3c8;font-size:12px;margin-top:16px;">
          ${senderName} · Liderify
        </p>
      </td>
    </tr>
  </table>

  <!-- Tracking pixel -->
  <img src="${auditUrl}?track=open" width="1" height="1" style="display:none;" alt="">
</body>
</html>`;

  const text = `${greeting},

He analizado la web de ${businessName} y he encontrado ${totalIssues} problemas que están afectando tu visibilidad en buscadores e inteligencia artificial.

${criticalCount > 0 ? `De estos, ${criticalCount} son críticos y requieren atención inmediata.` : ""}

Tu nota general: ${overallGrade} (${overallScore}/100)

Ver tu reporte completo: ${auditUrl}

Si quieres que te ayude a mejorar estas puntuaciones, responde a este email.

${senderName} · Liderify`;

  return { subject, html, text };
}
