import { useNavigate } from "react-router-dom";
import { IconButton, icons } from "@shared/ui";

export function BackHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      <IconButton label="Back" icon={icons.back} onClick={() => navigate(-1)} />
      <h1>{title}</h1>
    </div>
  );
}
