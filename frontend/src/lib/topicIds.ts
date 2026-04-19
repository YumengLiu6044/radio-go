/** URL-safe id for a topic label (Dynamo `topic_id`, UI grouping). */
export function slugifyTopicName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || `topic-${Date.now()}`
}

export function topicIdFromDynamoRow(topicId?: string, topicName?: string): string {
  const tid = (topicId ?? '').trim()
  if (tid) return tid
  const name = (topicName ?? '').trim()
  if (!name) return 'history'
  return slugifyTopicName(name)
}
