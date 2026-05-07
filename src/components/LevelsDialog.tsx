import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Typography,
  Box,
  Stack,
  FormControlLabel,
  Checkbox,
  Switch,
  Paper,
} from "@mui/material";
import {
  type LevelsConfig,
  defaultLevelsConfig,
  applyLevels,
  calculateHistogram,
} from "../utils/levels";

interface LevelsDialogProps {
  open: boolean;
  imageData: ImageData | null;
  isGb7?: boolean;
  onClose: () => void;
  onApply: (newData: ImageData) => void;
  onPreviewUpdate: (previewData: ImageData | null) => void;
}

type ChannelType = keyof LevelsConfig;

const LevelsDialog = ({
  open,
  imageData,
  isGb7,
  onClose,
  onApply,
  onPreviewUpdate,
}: LevelsDialogProps) => {
  const histCanvasRef = useRef<HTMLCanvasElement>(null);
  const internalPreviewRef = useRef<HTMLCanvasElement>(null);

  const [config, setConfig] = useState<LevelsConfig>(defaultLevelsConfig());
  const [activeChannel, setActiveChannel] = useState<ChannelType>("master");
  const [prevIsGb7, setPrevIsGb7] = useState(isGb7);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [isLogScale, setIsLogScale] = useState(false);

  if (isGb7 !== prevIsGb7) {
    setPrevIsGb7(isGb7);
    if (isGb7 && (activeChannel === "r" || activeChannel === "g" || activeChannel === "b")) {
      setActiveChannel("master");
    }
  }

  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 1. Расчет исходной гистограммы 
  const baseHistogram = useMemo(() => {
    if (!imageData || !open) return new Array(256).fill(0);
    return calculateHistogram(imageData, activeChannel);
  }, [imageData, activeChannel, open]);

  // 2. Генерация "живой" гистограммы на основе настроек (LUT-трансформация)
  const liveHistogramData = useMemo(() => {
    const { black, white, gamma } = config[activeChannel];
    const liveHist = new Array(256).fill(0);

    // временный LUT для трансформации гистограммы
    for (let i = 0; i < 256; i++) {
      let newValue = 0;
      if (i <= black) newValue = 0;
      else if (i >= white) newValue = 255;
      else {
        const normalized = (i - black) / (white - black);
        newValue = Math.min(
          255,
          Math.max(0, Math.round(Math.pow(normalized, 1 / gamma) * 255)),
        );
      }
      // Перенос количество пикселей из старого уровня в новый
      liveHist[newValue] += baseHistogram[i];
    }
    return liveHist;
  }, [baseHistogram, config, activeChannel]);

  // 3. Отрисовка гистограммы 
  useEffect(() => {
    const canvas = histCanvasRef.current;
    if (!canvas || !open) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sorted = [...liveHistogramData].sort((a, b) => a - b);
    const visualMax = sorted[250] || 1; 
    const absoluteMax = sorted[255] || 1;

    if (absoluteMax === 0) return;

    // Настраиваем стиль заливки (полупрозрачный синий)
    ctx.fillStyle = "rgba(25, 118, 210, 0.75)";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);

    for (let i = 0; i < 256; i++) {
      const val = liveHistogramData[i];
      let heightRatio = 0;

      if (isLogScale) {
        heightRatio =
          val > 0 ? Math.log10(val + 1) / Math.log10(absoluteMax + 1) : 0;
      } else {
        heightRatio = val / visualMax;
      }

      const h = Math.min(canvas.height, heightRatio * canvas.height);
      const x = (i / 255) * canvas.width;

      ctx.lineTo(x, canvas.height - h);
    }

    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#1565c0";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [liveHistogramData, isLogScale, open]);

  // 4. Отрисовка внутреннего превью и обновление главного холста
  const updatePreviews = useCallback(
    (currentConfig: LevelsConfig) => {
      if (!imageData) return;

      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);

      updateTimerRef.current = setTimeout(() => {
        const processed = applyLevels(imageData, currentConfig);

        if (isPreviewEnabled) onPreviewUpdate(processed);
        else onPreviewUpdate(null);

        const previewCanvas = internalPreviewRef.current;
        if (previewCanvas) {
          const pCtx = previewCanvas.getContext("2d");
          if (pCtx) {
            const scale = Math.min(
              previewCanvas.width / processed.width,
              previewCanvas.height / processed.height,
            );
            const x = (previewCanvas.width - processed.width * scale) / 2;
            const y = (previewCanvas.height - processed.height * scale) / 2;

            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = processed.width;
            tempCanvas.height = processed.height;
            tempCanvas.getContext("2d")?.putImageData(processed, 0, 0);

            pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            pCtx.drawImage(
              tempCanvas,
              x,
              y,
              processed.width * scale,
              processed.height * scale,
            );
          }
        }
      }, 40);
    },
    [imageData, isPreviewEnabled, onPreviewUpdate],
  );

  useEffect(() => {
    if (open) updatePreviews(config);
  }, [config, isPreviewEnabled, open, updatePreviews]);

  const handleLevelsChange = (
    type: "black" | "white" | "gamma",
    value: number,
  ) => {
    setConfig((prev) => ({
      ...prev,
      [activeChannel]: { ...prev[activeChannel], [type]: value },
    }));
  };

  return (
    <Dialog
      open={open}
      hideBackdrop
      disableEnforceFocus
      slotProps={{
        paper: {
          elevation: 4,
          sx: {
            position: "fixed",
            right: 260, 
            top: 80,
            m: 0,
            width: 350,
          },
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>Levels & Preview</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Paper
            variant="outlined"
            sx={{
              height: 180,
              bgcolor: "#222",
              overflow: "hidden",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <canvas ref={internalPreviewRef} width={320} height={180} />
          </Paper>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Channel</InputLabel>
              <Select
                value={activeChannel}
                label="Channel"
                onChange={(e) =>
                  setActiveChannel(e.target.value as ChannelType)
                }
              >
                <MenuItem value="master">{isGb7 ? "Master" : "RGB (Master)"}</MenuItem>
                {!isGb7 && <MenuItem value="r">Red</MenuItem>}
                {!isGb7 && <MenuItem value="g">Green</MenuItem>}
                {!isGb7 && <MenuItem value="b">Blue</MenuItem>}
                <MenuItem value="a">Alpha</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={isLogScale}
                  onChange={(e) => setIsLogScale(e.target.checked)}
                />
              }
              label={<Typography variant="caption">Log</Typography>}
            />
          </Box>

          <Box sx={{ border: "1px solid #ccc", bgcolor: "#f9f9f9", p: 0.5 }}>
            <canvas
              ref={histCanvasRef}
              width={256}
              height={80}
              style={{ width: "100%", height: "80px", display: "block" }}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Input: {config[activeChannel].black} /{" "}
              {config[activeChannel].gamma.toFixed(2)} /{" "}
              {config[activeChannel].white}
            </Typography>
            <Slider
              value={[
                config[activeChannel].black,
                Math.round(
                  config[activeChannel].black +
                    (config[activeChannel].white - config[activeChannel].black) *
                      Math.pow(0.5, config[activeChannel].gamma),
                ),
                config[activeChannel].white,
              ]}
              onChange={(_, val, activeThumb) => {
                const [b, g, w] = val as number[];
                const currentBlack = config[activeChannel].black;
                const currentWhite = config[activeChannel].white;

                if (activeThumb === 0) {
                  const newBlack = Math.min(b, currentWhite - 2);
                  handleLevelsChange("black", newBlack);
                } else if (activeThumb === 2) {
                  const newWhite = Math.max(w, currentBlack + 2);
                  handleLevelsChange("white", newWhite);
                } else if (activeThumb === 1) {
                  if (currentWhite - currentBlack > 0) {
                    const minRel = Math.pow(0.5, 9.9);
                    const maxRel = Math.pow(0.5, 0.1);
                    const relativeMid = Math.min(
                      maxRel,
                      Math.max(minRel, (g - currentBlack) / (currentWhite - currentBlack)),
                    );
                    const newGamma = Math.log(relativeMid) / Math.log(0.5);
                    handleLevelsChange(
                      "gamma",
                      Number(Math.min(9.9, Math.max(0.1, newGamma)).toFixed(2)),
                    );
                  }
                }
              }}
              min={0}
              max={255}
              disableSwap
              size="small"
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={isPreviewEnabled}
              onChange={(e) => setIsPreviewEnabled(e.target.checked)}
            />
          }
          label={<Typography variant="caption">Main Preview</Typography>}
          sx={{ flexGrow: 1 }}
        />
        <Button size="small" onClick={() => setConfig(defaultLevelsConfig())}>
          Reset
        </Button>
        <Button
          size="small"
          color="error"
          onClick={() => {
            onPreviewUpdate(null);
            onClose();
          }}
        >
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            if (imageData) {
              const final = applyLevels(imageData, config);
              onApply(final);
            }
          }}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LevelsDialog;
;
