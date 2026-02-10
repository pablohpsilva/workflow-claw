import Handlebars from "handlebars";

const templateCache = new Map<string, Handlebars.TemplateDelegate>();

export function renderTemplate(template: string, data: Record<string, string>) {
  let compiled = templateCache.get(template);
  if (!compiled) {
    compiled = Handlebars.compile(template, { noEscape: true });
    templateCache.set(template, compiled);
  }
  return compiled(data);
}
