interface UserMessageProps {
  content: string;
}

function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end pr-2 pb-4 pl-10">
      <div className="bg-amber-500/10 dark:bg-amber-500/5 max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed break-words">
        {content}
      </div>
    </div>
  );
}

export default UserMessage;
