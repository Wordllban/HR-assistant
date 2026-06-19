import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AnswerMarkdownProps {
  children: string
}

/**
 * Renders a streamed assistant answer as formatted markdown — bold, lists, headings,
 * inline code, tables (GFM) — instead of showing raw `**` syntax. Links open safely in a
 * new tab. Styling lives in the `.answer-md` scope (styles.css) so it inherits the bubble
 * colour and stays tight. Partial markdown mid-stream resolves as more tokens arrive.
 */
export function AnswerMarkdown({ children }: AnswerMarkdownProps) {
  return (
    <div className="answer-md">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer noopener" />
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  )
}
