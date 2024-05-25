import { HomeIcon } from "@radix-ui/react-icons";
import { Button } from "./components/ui/button";
import { SheetTitle } from "./components/ui/sheet";
import { useNavigate } from "react-router-dom";
import Player from "./Player";

function Header({
  children,
}: {
  children?: React.ReactNode[] | React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <SheetTitle className="flex justify-between items-center">
      <div className="flex gap-2 items-center">
        <Button
          variant="outline"
          onClick={() => {
            void navigate("/");
          }}
        >
          <HomeIcon />
        </Button>
        <div>JS Bee</div>
      </div>
      {children}
      <Player />
    </SheetTitle>
  );
}

export default Header;
