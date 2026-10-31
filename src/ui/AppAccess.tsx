import { useEffect, useState } from "react";
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function useAppAccess() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(
    () =>
      matchMedia("(display-mode: standalone)").matches ||
      matchMedia("(display-mode: fullscreen)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const install = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    const changed = () => setFullscreen(!!document.fullscreenElement);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", done);
    document.addEventListener("fullscreenchange", changed);
    return () => {
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", done);
      document.removeEventListener("fullscreenchange", changed);
    };
  }, []);
  return {
    installed,
    fullscreen,
    fullscreenAvailable: document.fullscreenEnabled,
    canInstall: !!prompt,
    secure: window.isSecureContext,
    notice,
    async toggleFullscreen() {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
        setNotice("");
      } catch {
        setNotice(
          "全画面表示に切り替えられませんでした。ホーム画面からの起動もお試しください。",
        );
      }
    },
    async install() {
      if (!prompt) return;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setPrompt(null);
      } catch {
        setNotice("ブラウザのメニューからホーム画面に追加してください。");
      }
    },
  };
}
export function AppInstallInfo({
  access,
}: {
  access: ReturnType<typeof useAppAccess>;
}) {
  return (
    <div className="install-info">
      {access.installed ? (
        <p>ホーム画面から起動しています。</p>
      ) : !access.secure ? (
        <p>
          アプリとして追加するには、HTTPSのURLで開いてください。このLAN用URLではブラウザで遊べます。
        </p>
      ) : access.canInstall ? (
        <button className="primary full" onClick={() => void access.install()}>
          ホーム画面に追加
        </button>
      ) : (
        <>
          <p>iPhone・iPad：Safariの共有メニューから「ホーム画面に追加」。</p>
          <p>
            Android：ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」。
          </p>
        </>
      )}
      <p>
        追加後はホーム画面のアイコンから起動できます。画面の広さは端末の表示仕様に合わせます。
      </p>
      <p>
        対戦には通信が必要です。インストール先のブラウザごとに成績と図鑑を保存します。
      </p>
      {access.notice && <p role="status">{access.notice}</p>}
    </div>
  );
}
