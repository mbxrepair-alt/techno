/**
 * Centralized mailer — one MBX account sends for all ateliers.
 * Atelier identity is passed via displayName + replyTo.
 */
import nodemailer from "nodemailer";

export function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/** Build the From field: "Atelier Name <mbxrepair@gmail.com>" */
export function fromAddress(atelierName?: string) {
  const display = atelierName?.trim() || "MBX Réparations";
  return `"${display}" <${process.env.EMAIL_USER}>`;
}
