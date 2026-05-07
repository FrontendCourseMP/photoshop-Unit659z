import type { ChangeEvent, RefObject } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Stack,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import ColorizeIcon from "@mui/icons-material/Colorize";
import TuneIcon from "@mui/icons-material/Tune";

interface HeaderProps {
  fileInputRef: RefObject<HTMLInputElement>;
  isEyedropperActive: boolean;
  onOpenClick: () => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSavePNG: () => void;
  onSaveJPG: () => void;
  onSaveGB7: () => void;
  onToggleEyedropper: () => void;
  onOpenLevels: () => void;
}

const Header = ({
  fileInputRef,
  isEyedropperActive,
  onOpenClick,
  onFileChange,
  onSavePNG,
  onSaveJPG,
  onSaveGB7,
  onToggleEyedropper,
  onOpenLevels,
}: HeaderProps) => {
  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          GrayBit Editor
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.gb7"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={onFileChange}
          />

          <Tooltip title="Eyedropper Tool">
            <IconButton
              color={isEyedropperActive ? "secondary" : "inherit"}
              onClick={onToggleEyedropper}
              sx={{
                bgcolor: isEyedropperActive
                  ? "rgba(255,255,255,0.1)"
                  : "transparent",
              }}
            >
              <ColorizeIcon />
            </IconButton>
          </Tooltip>
          <Button
            color="inherit"
            startIcon={<TuneIcon />}
            onClick={onOpenLevels}
          >
            Levels
          </Button>

          <Button
            color="inherit"
            startIcon={<UploadFileIcon />}
            onClick={onOpenClick}
          >
            Open
          </Button>
          <Button
            color="inherit"
            startIcon={<DownloadIcon />}
            onClick={onSavePNG}
          >
            Save PNG
          </Button>
          <Button
            color="inherit"
            startIcon={<DownloadIcon />}
            onClick={onSaveJPG}
          >
            Save JPG
          </Button>
          <Button
            color="inherit"
            startIcon={<DownloadIcon />}
            onClick={onSaveGB7}
          >
            Save GB7
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
