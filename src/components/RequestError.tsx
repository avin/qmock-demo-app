import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function RequestError({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }
  let message = "Не удалось связаться с сервером";
  let status = "";
  if (typeof error === "object" && "status" in error) {
    status = String(error.status);
    if ("data" in error && error.data && typeof error.data === "object" && "error" in error.data) {
      message = String(error.data.error);
    }
  }
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Запрос не выполнен {status && `· ${status}`}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
