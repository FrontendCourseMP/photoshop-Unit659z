import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Paper,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect, useRef, memo } from "react";

interface ChannelsPanelProps {
  imageData: ImageData | null;
  channels: { r: boolean; g: boolean; b: boolean; a: boolean };
  onToggleChannel: (channel: "r" | "g" | "b" | "a") => void;
  imgInfo: {
    width: number;
    height: number;
    depth: number;
    hasMask: boolean;
  };
}

interface ChannelItemProps {
  name: string;
  id: "r" | "g" | "b" | "a";
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onToggle: (id: "r" | "g" | "b" | "a") => void;
}

const ChannelItem = memo(
  ({ name, id, active, canvasRef, onToggle }: ChannelItemProps) => (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => onToggle(id)}
        selected={active}
        sx={{
          flexDirection: "column",
          alignItems: "flex-start",
          borderLeft: active ? "4px solid #1976d2" : "4px solid transparent",
          mb: 1,
          transition: "all 0.2s",
          "&.Mui-selected": {
            bgcolor: alpha("#1976d2", 0.08),
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: "bold",
            color: active ? "primary.main" : "text.secondary",
          }}
        >
          {name} {active ? "(Active)" : "(Hidden)"}
        </Typography>
        <Paper
          elevation={1}
          sx={{
            width: "100%",
            height: 80,
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            bgcolor: "#222",
            mt: 0.5,
            border: "1px solid",
            borderColor: active ? alpha("#1976d2", 0.3) : "divider",
            backgroundImage:
              "repeating-conic-gradient(#333 0% 25%, #222 0% 50%)",
            backgroundSize: "10px 10px",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              filter: active ? "none" : "grayscale(100%) opacity(50%)",
            }}
          />
        </Paper>
      </ListItemButton>
    </ListItem>
  ),
);

ChannelItem.displayName = "ChannelItem";

const ChannelsPanel = ({
  imageData,
  channels,
  onToggleChannel,
  imgInfo,
}: ChannelsPanelProps) => {
  const rRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef<HTMLCanvasElement>(null);
  const bRef = useRef<HTMLCanvasElement>(null);
  const aRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageData) return;

    const drawChannel = (
      ref: React.RefObject<HTMLCanvasElement | null>,
      channelIndex: number,
    ) => {
      const canvas = ref.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width, height, data } = imageData;

      const maxThumbSize = 200;
      let thumbWidth, thumbHeight;
      if (width > height) {
        thumbWidth = maxThumbSize;
        thumbHeight = Math.max(1, Math.round((height / width) * maxThumbSize)); 
      } else {
        thumbHeight = maxThumbSize;
        thumbWidth = Math.max(1, Math.round((width / height) * maxThumbSize)); 
      }

      canvas.width = thumbWidth;
      canvas.height = thumbHeight;

      const thumbData = ctx.createImageData(thumbWidth, thumbHeight);
      const scaleX = width / thumbWidth;
      const scaleY = height / thumbHeight;

      for (let y = 0; y < thumbHeight; y++) {
        for (let x = 0; x < thumbWidth; x++) {
          const origX = Math.floor(x * scaleX);
          const origY = Math.floor(y * scaleY);
          const origIdx = (origY * width + origX) * 4;
          const thumbIdx = (y * thumbWidth + x) * 4;

          const value = data[origIdx + channelIndex];
          thumbData.data[thumbIdx] = value;
          thumbData.data[thumbIdx + 1] = value;
          thumbData.data[thumbIdx + 2] = value;
          thumbData.data[thumbIdx + 3] = 255;
        }
      }
      ctx.putImageData(thumbData, 0, 0);
    };

    const timer = setTimeout(() => {
      drawChannel(rRef, 0);
      drawChannel(gRef, 1);
      drawChannel(bRef, 2);
      drawChannel(aRef, 3);
    }, 0);

    return () => clearTimeout(timer);
  }, [imageData, imgInfo]);

  const isGrayscale = imgInfo.depth === 7;
  const hasAlpha = imgInfo.depth === 32 || (isGrayscale && imgInfo.hasMask);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
        Channels
      </Typography>
      <List sx={{ pt: 0 }}>
        {isGrayscale ? (
          <ChannelItem
            name="Grayscale"
            id="r"
            active={channels.r}
            canvasRef={rRef}
            onToggle={onToggleChannel}
          />
        ) : (
          <>
            <ChannelItem
              name="Red"
              id="r"
              active={channels.r}
              canvasRef={rRef}
              onToggle={onToggleChannel}
            />
            <ChannelItem
              name="Green"
              id="g"
              active={channels.g}
              canvasRef={gRef}
              onToggle={onToggleChannel}
            />
            <ChannelItem
              name="Blue"
              id="b"
              active={channels.b}
              canvasRef={bRef}
              onToggle={onToggleChannel}
            />
          </>
        )}
        {hasAlpha && (
          <ChannelItem
            name="Alpha"
            id="a"
            active={channels.a}
            canvasRef={aRef}
            onToggle={onToggleChannel}
          />
        )}
      </List>
    </Box>
  );
};

export default ChannelsPanel;
