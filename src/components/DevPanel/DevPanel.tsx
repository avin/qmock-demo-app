import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import styles from "./DevPanel.module.css";

export function DevPanel() {
  return (
    <Dialog.Root>
      <aside className={styles.panel} aria-label="Developer panel">
        <Dialog.Trigger className={styles.trigger}>Mock overrides</Dialog.Trigger>
      </aside>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.backdrop} />
        <Dialog.Content className={styles.popup} aria-describedby={undefined}>
          <Dialog.Title className="sr-only">Mock overrides</Dialog.Title>
          <Dialog.Close className={styles.close} aria-label="Close mock overrides">
            <X size={16} />
          </Dialog.Close>
          {/* eslint-disable-next-line react/iframe-missing-sandbox -- Локальной панели QMock нужны скрипты и доступ к своему origin. */}
          <iframe className={styles.frame} src="/__apiMock" title="Mock overrides" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
