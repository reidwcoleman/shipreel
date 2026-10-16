import React, { useEffect } from "react";
import { AbsoluteFill, Composition, isHtmlInCanvasSupported, useRemotionEnvironment } from "remotion";
import { ImgProbe } from "./media";
import { CameraBlurScene, StaticColorProbe, TrailDemo, TransitionOnlyBlurScene } from "./motion-blur";
import { Phone3DShot } from "./phone3d";
import { DemoScene } from "./scene";
import { SmoothDemo } from "./smooth";
import { FontsDemo, SubpixelProbe, TextScaleProbe, type ScaleMode } from "./text";
import { ThreePhoneShot } from "./three-phone";
import { TransitionsBench } from "./transitions";

const W = 1080;
const H = 1920;
const FPS = 30;

/** Logs what the render browser supports (read by bench.mjs via onBrowserLog). */
const EnvProbe: React.FC = () => {
  const env = useRemotionEnvironment();
  useEffect(() => {
    const c = document.createElement("canvas");
    const gl2 = !!c.getContext("webgl2");
    const dbg = (() => {
      const g = document.createElement("canvas").getContext("webgl");
      const ext = g?.getExtension("WEBGL_debug_renderer_info");
      return ext && g ? String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "n/a";
    })();
    console.log(
      "ENVPROBE " +
        JSON.stringify({
          htmlInCanvas: isHtmlInCanvasSupported(),
          webgl2: gl2,
          glRenderer: dbg,
          userAgent: navigator.userAgent,
          dpr: window.devicePixelRatio,
          env,
        }),
    );
  }, [env]);
  return <AbsoluteFill style={{ background: "#000" }} />;
};

const TEXT_MODES: ScaleMode[] = ["native", "scaleUp2x", "scaleDown2x", "scaleUp2xWillChange", "popIn", "popInWillChange", "popInWillChangeReset"];
const TRANSITION_KINDS = ["none", "css", "shader", "whip-svg", "whip-smear", "css-blur-whip", "lightleak", "flash"] as const;

export const Root: React.FC = () => (
  <>
    <Composition id="env" component={EnvProbe} width={W} height={H} fps={FPS} durationInFrames={1} />
    <Composition id="baseline" component={DemoScene} width={W} height={H} fps={FPS} durationInFrames={90} />
    <Composition id="mb5" component={CameraBlurScene} width={W} height={H} fps={FPS} durationInFrames={90} defaultProps={{ samples: 5 }} />
    <Composition id="mb10" component={CameraBlurScene} width={W} height={H} fps={FPS} durationInFrames={90} defaultProps={{ samples: 10 }} />
    <Composition id="mb-transition-only" component={TransitionOnlyBlurScene} width={W} height={H} fps={FPS} durationInFrames={90} />
    <Composition id="trail" component={TrailDemo} width={W} height={H} fps={FPS} durationInFrames={90} />
    {TRANSITION_KINDS.map((kind) => (
      <Composition
        key={kind}
        id={`t-${kind}`}
        component={TransitionsBench}
        width={W}
        height={H}
        fps={FPS}
        durationInFrames={kind === "lightleak" || kind === "flash" ? 144 : 114}
        defaultProps={{ kind }}
      />
    ))}
    <Composition id="phone3d" component={Phone3DShot} width={W} height={H} fps={FPS} durationInFrames={90} />
    <Composition id="three-phone" component={ThreePhoneShot} width={W} height={H} fps={FPS} durationInFrames={90} />
    <Composition id="smooth" component={SmoothDemo} width={W} height={H} fps={FPS} durationInFrames={90} />
    <Composition id="fonts" component={FontsDemo} width={W} height={H} fps={FPS} durationInFrames={30} />
    {TEXT_MODES.map((mode) => (
      <Composition key={mode} id={`text-${mode}`} component={TextScaleProbe} width={W} height={H} fps={FPS} durationInFrames={40} defaultProps={{ mode }} />
    ))}
    {(["plain", "translate3d", "perspectiveWillChange"] as const).map((mode) => (
      <Composition key={mode} id={`subpixel-${mode}`} component={SubpixelProbe} width={W} height={H} fps={FPS} durationInFrames={12} defaultProps={{ mode }} />
    ))}
    {[1, 5, 10].map((samples) => (
      <Composition key={samples} id={`color-${samples}`} component={StaticColorProbe} width={W} height={H} fps={FPS} durationInFrames={30} defaultProps={{ samples }} />
    ))}
    {([300, 622] as const).flatMap((box) =>
      (["css", "scaledLayer", "preResized"] as const).map((mode) => (
        <Composition key={`${box}-${mode}`} id={`img-${box}-${mode}`} component={ImgProbe} width={W} height={H} fps={FPS} durationInFrames={1} defaultProps={{ box, mode }} />
      )),
    )}
  </>
);
