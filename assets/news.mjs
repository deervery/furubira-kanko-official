const fields = ["id", "title", "body", "title_en", "body_en", "published_on"]
function fail(message) { const error = new Error(message); error.issues = [{ message }]; throw error }
export function validateNews(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("入力を確認してください")
  if (Object.keys(value).some(key => !fields.includes(key))) fail("入力を確認してください")
  const out = {}
  for (const key of fields) {
    const item = value[key] === undefined && ["title_en", "body_en"].includes(key) ? "" : value[key]
    if (typeof item !== "string") fail("入力を確認してください")
    out[key] = ["title", "body", "title_en", "body_en"].includes(key) ? item.trim() : item
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(out.id)) fail("IDは半角英小文字・数字・ハイフンで入力してください")
  if (out.id.length > 100) fail("String must contain at most 100 character(s)")
  if (!out.title) fail("タイトルを入力してください")
  if (!out.body) fail("本文を入力してください")
  for (const [key,limit] of [["title",200],["body",20000],["title_en",200],["body_en",20000]]) if (out[key].length > limit) fail("String must contain at most " + limit + " character(s)")
  const date = new Date(out.published_on + "T00:00:00Z")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out.published_on) || Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== out.published_on) fail("日付を確認してください")
  if (Boolean(out.title_en) !== Boolean(out.body_en)) fail("英語はタイトルと本文を両方入力してください")
  return out
}
export const newsInput = { parse: validateNews, safeParse(value) { try { return { success:true, data:validateNews(value) } } catch(error) { return {success:false,error} } } }
export const newsCollection = {
 parse(values) {
  if (!Array.isArray(values) || values.length > 1000) fail("news.jsonの形式を確認してください")
  const items = values.map(validateNews)
  if (new Set(items.map(item=>item.id)).size !== items.length) fail("IDが重複しています")
  return items
 },
 safeParse(value) { try { return { success:true, data:this.parse(value) } } catch(error) { return {success:false,error} } },
}
export function newsText(item,lang) {
  const translated = lang === "en" && Boolean(item.title_en && item.body_en)
  return {title:translated?item.title_en:item.title,body:translated?item.body_en:item.body,lang:translated?"en":"ja"}
}
export function sortNews(items) { return [...items].sort((a,b)=>b.published_on.localeCompare(a.published_on)||a.id.localeCompare(b.id)) }
export function upsertNews(items,input,previousId) {
  const item = validateNews(input)
  if (items.some(existing=>existing.id===item.id&&existing.id!==previousId)) fail("IDが重複しています")
  return sortNews(newsCollection.parse([...items.filter(existing=>existing.id!==previousId),item]))
}
