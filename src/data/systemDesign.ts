import type { Item } from "../lib/types";
import { slugify } from "./neetcode150";

// [Chinese title, English title]
const SDC: [string, [string, string][]][] = [
 ["基础概念",[["扩展性与负载均衡","Scalability & Load Balancing"],["缓存策略","Caching (write-through / write-back / eviction)"],["数据库选型与索引","SQL vs NoSQL, indexes"],["分片与复制","Sharding & Replication"],["一致性与 CAP","Consistency models, CAP / PACELC"],["一致性哈希","Consistent Hashing"],["消息队列与异步处理","Message Queues, pub/sub"],["限流算法","Token bucket, leaky bucket, sliding window"],["CDN 与对象存储","CDN & Blob storage"],["API 设计与幂等","REST / gRPC, pagination, idempotency"]]],
 ["经典设计题",[["短链接服务","URL Shortener (TinyURL)"],["Pastebin","Pastebin"],["分布式限流器","Rate Limiter"],["分布式 KV 存储","Key-Value Store (Dynamo)"],["唯一 ID 生成器","Unique ID Generator (Snowflake)"],["网页爬虫","Web Crawler"],["通知系统","Notification System"],["新闻信息流","News Feed (Twitter / Instagram)"],["聊天系统","Chat System (WhatsApp)"],["搜索自动补全","Search Autocomplete"],["视频平台","YouTube / Video Streaming"],["云盘同步","Google Drive / Dropbox"],["网约车","Ride Sharing (Uber)"],["附近的商家","Proximity Service (Yelp)"],["票务抢购","Ticketmaster"],["分布式消息队列","Distributed Message Queue (Kafka)"],["指标监控系统","Metrics & Monitoring"],["支付系统","Payment System"],["排行榜 / Top-K","Leaderboard & Top-K"]]]
];

export const SD_CATEGORIES: string[] = SDC.map((x) => x[0]);

export const SYSTEM_DESIGN: Item[] = SDC.flatMap(([category, list], ci) =>
  list.map(([title, en]) => ({
    id: (ci ? "sd-" : "sc-") + slugify(en).slice(0, 40),
    title,
    subtitle: en,
    category,
  })),
);
