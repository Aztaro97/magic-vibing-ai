interface UserMessageProps {
  content: string;
}

function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end pr-2 pb-4 pl-10">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-amber-500/10 px-4 py-2.5 text-sm leading-relaxed break-words dark:bg-amber-500/5">
        {content}
      </div>
    </div>
  );
}

export default UserMessage;
