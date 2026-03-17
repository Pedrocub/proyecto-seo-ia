"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900">
          Configuración
        </h1>
        <p className="text-navy-500 text-sm mt-1">
          Ajusta la plataforma a tus necesidades
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-warm-100 rounded-lg p-1 mb-6 w-fit">
        {[
          { key: "general", label: "General" },
          { key: "email", label: "Email (SMTP)" },
          { key: "api", label: "APIs" },
          { key: "branding", label: "Branding" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-navy-900 shadow-sm"
                : "text-navy-500 hover:text-navy-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-6">
        {activeTab === "general" && (
          <div className="space-y-6">
            <SettingField label="Nombre de la empresa" placeholder="Liderify" defaultValue="Liderify" />
            <SettingField label="URL base de auditorías" placeholder="https://audits.liderify.com" />
            <SettingField label="URL de CTA (calendly, etc.)" placeholder="https://app.reclaim.ai/m/liderify/consulta" />
            <SettingField label="Texto del botón CTA" placeholder="Agenda una Consulta Gratuita" defaultValue="Agenda una Consulta Gratuita" />
          </div>
        )}

        {activeTab === "email" && (
          <div className="space-y-6">
            <SettingField label="Servidor SMTP" placeholder="smtp.gmail.com" />
            <div className="grid grid-cols-2 gap-4">
              <SettingField label="Puerto" placeholder="587" />
              <SettingField label="Seguridad" placeholder="TLS" />
            </div>
            <SettingField label="Email remitente" placeholder="hola@liderify.com" />
            <SettingField label="Contraseña / App Password" placeholder="••••••••" type="password" />
            <SettingField label="Nombre del remitente" placeholder="Adel Ibarra - Liderify" />
            <button className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm">
              Enviar Email de Prueba
            </button>
          </div>
        )}

        {activeTab === "api" && (
          <div className="space-y-6">
            <SettingField label="Google Places API Key" placeholder="AIza..." type="password" />
            <SettingField label="Google PageSpeed API Key" placeholder="AIza..." type="password" />
            <p className="text-navy-400 text-xs">
              Las API keys se almacenan de forma segura y se usan para el scraping de Google Maps y el análisis de rendimiento web.
            </p>
          </div>
        )}

        {activeTab === "branding" && (
          <div className="space-y-6">
            <SettingField label="Nombre en los reportes" placeholder="Liderify" defaultValue="Liderify" />
            <SettingField label="Color primario" placeholder="#199473" defaultValue="#199473" />
            <SettingField label="Instagram" placeholder="@liderify" />
            <SettingField label="LinkedIn" placeholder="linkedin.com/company/liderify" />
            <SettingField label="Texto del footer" placeholder="Reporte generado por Liderify" defaultValue="Reporte generado por Liderify" />
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-warm-200">
          <button className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm">
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingField({
  label,
  placeholder,
  defaultValue,
  type = "text",
}: {
  label: string;
  placeholder: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-700 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full border border-warm-200 rounded-lg px-4 py-2 text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );
}
