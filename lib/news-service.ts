import source from "../content/news.json"
import { newsCollection, sortNews, type NewsItem } from "./news"

// Published content is versioned and deployed with the existing static site data.
// There is no database connection or runtime write endpoint.
const news = sortNews(newsCollection.parse(source))
export async function getPublicNews(id?: string): Promise<NewsItem[]> {
  return id ? news.filter(item => item.id === id) : news
}
