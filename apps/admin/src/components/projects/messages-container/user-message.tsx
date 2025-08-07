import { Card } from "@acme/ui/card";

interface UserMessageProps {
  content: string;
}

function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end pr-2 pb-4 pl-10">
      <Card className="bg-muted max-w-[80%] rounded-lg border-none p-3 break-words shadow-none">
        {content}
      </Card>
    </div>
  );
}

export default UserMessage;
