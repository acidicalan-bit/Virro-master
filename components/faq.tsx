import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqs } from "@/content/site";

export function FAQ() {
  return <Accordion type="single" collapsible>{faqs.map(([question, answer], index) => <AccordionItem value={`faq-${index}`} key={question}><AccordionTrigger>{question}</AccordionTrigger><AccordionContent>{answer}</AccordionContent></AccordionItem>)}</Accordion>;
}
