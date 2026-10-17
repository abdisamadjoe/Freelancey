import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Gigly: Terms and Conditions",
  description: "The terms for using the Gigly website, the open-source software and the hosted service.",
  path: "/terms-conditions",
});

export default function TermsConditionsPage() {
  return (
    <LegalPage
      title="Terms and conditions"
      intro="The short version of how the website, the open-source software and the hosted service may be used."
      updated="14 October 2026"
      sections={[
        {
          heading: "Open-source software",
          paragraphs: [
            "Gigly is released under the MIT licence. You may use, copy, modify and distribute it under the terms of that licence, which is provided as is, without warranty of any kind.",
          ],
        },
        {
          heading: "Self-hosting",
          paragraphs: [
            "If you run Gigly yourself, you are responsible for your servers, backups, security updates and the data you store, including any obligations you have to your own clients.",
          ],
        },
        {
          heading: "Hosted service",
          paragraphs: [
            "Where we run Gigly for you, the plan, price and support terms are agreed with you directly. You are responsible for the content you store and for keeping your account credentials secure.",
          ],
        },
        {
          heading: "Acceptable use",
          paragraphs: [
            "Do not use the website or hosted service to break the law, attack or overload the service, or access data that is not yours.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "To the extent the law allows, we are not liable for indirect or consequential loss arising from use of the software or the hosted service.",
          ],
        },
        {
          heading: "Changes",
          paragraphs: ["We may update these terms. The date at the bottom of this page shows when they last changed."],
        },
      ]}
    />
  );
}
