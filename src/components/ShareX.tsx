"use client";
export default function ShareX({ slug, line }: { slug: string; line: string }) {
  const url = `https://getgolem.xyz/a/${slug}`;
  const text = `${line}\n\nBuilt on @getgolem, no code.`;
  return <a target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} className="btn btn-accent">Share on X</a>;
}
