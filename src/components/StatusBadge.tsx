import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getVariant = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("approved") || lowerStatus.includes("completed")) {
      return "default";
    }
    if (lowerStatus.includes("pending") || lowerStatus.includes("waiting")) {
      return "secondary";
    }
    if (lowerStatus.includes("rejected") || lowerStatus.includes("cancelled")) {
      return "destructive";
    }
    return "outline";
  };

  return <Badge variant={getVariant(status)}>{status}</Badge>;
}