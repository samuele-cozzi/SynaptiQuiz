import { notFound } from "next/navigation";
import { SynaptiQuizApp } from "@/components/synaptiquiz-app";

export default async function LocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "it") notFound();
  return <SynaptiQuizApp locale={locale} />;
}