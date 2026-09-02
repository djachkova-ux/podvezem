export default function QueueTag({ queue }) {
  return <span className={`q q${queue}`}>{queue} очередь</span>;
}
