import { Link } from "react-router-dom";
import { Button } from "./components/ui/button";

function ErrorPage() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center w-full h-full">
      <div>Uh oh! Something went wrong.</div>
      <Link to={"/"}>
        <Button variant="default">Go back home.</Button>
      </Link>
    </div>
  );
}

export default ErrorPage;
