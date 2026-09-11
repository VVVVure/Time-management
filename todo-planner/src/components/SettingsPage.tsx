import { useEffect, useRef, useState } from 'react';
import { downloadBackup, importData } from '../backup';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../db';
import type { Settings } from '../types';

interface Props {
  onBack: () => void;
}

const MAX_MINUTES_OPTIONS = [15, 25, 45, 60];

function SettingsPage({ onBack }: Props) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [importConfirm, setImportConfirm] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getSettings().then((s) => {
      if (!cancelled) {
        setSettings(s);
        setPasswordDraft(s.appPassword);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const applySettings = async (next: Settings) => {
    setSettings(next);
    await saveSettings(next);
  };

  const savePassword = async () => {
    await applySettings({ ...settings, appPassword: passwordDraft });
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 1500);
  };

  const handleImportFile = (file: File | undefined) => {
    if (file) setImportConfirm(file);
  };

  const confirmImport = async () => {
    if (!importConfirm) return;
    try {
      await importData(importConfirm);
      setMessage({ type: 'ok', text: '导入成功，现有数据已被覆盖' });
      setImportConfirm(null);
      const s = await getSettings();
      setSettings(s);
      setPasswordDraft(s.appPassword);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '导入失败',
      });
      setImportConfirm(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col px-4 pb-8 pt-4">
      <div className="mb-4 flex items-center">
        <button type="button" onClick={onBack} className="text-base text-blue-600">
          ‹ 返回
        </button>
        <h1 className="flex-1 text-center text-xl font-bold">设置</h1>
        <span className="w-12" />
      </div>

      {message && (
        <div
          className={`mb-3 rounded-xl px-3 py-2.5 text-sm ${
            message.type === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-2xl bg-white p-4">
        <h2 className="text-sm font-medium text-gray-500">每个步骤最长时间</h2>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {MAX_MINUTES_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => applySettings({ ...settings, maxMinutesPerStep: m })}
              className={`rounded-xl py-2.5 text-sm font-medium transition ${
                settings.maxMinutesPerStep === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {m} 分钟
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-white p-4">
        <h2 className="text-sm font-medium text-gray-500">App 密码（访问 AI 接口用）</h2>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="password"
            value={passwordDraft}
            onChange={(e) => setPasswordDraft(e.target.value)}
            placeholder="Worker 的 APP_PASSWORD"
            className="min-w-0 flex-1 rounded-xl bg-gray-100 px-3 py-2.5 text-base outline-none"
            style={{ fontSize: 16 }}
          />
          <button
            type="button"
            onClick={savePassword}
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            {passwordSaved ? '已保存' : '保存'}
          </button>
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-white p-4">
        <h2 className="text-sm font-medium text-gray-500">备份</h2>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => downloadBackup()}
            className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700"
          >
            导出备份
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700"
          >
            导入备份
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => handleImportFile(e.target.files?.[0])}
          />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          导出会下载一个带日期的 JSON 文件；导入会覆盖当前所有任务和设置。
        </p>
      </section>

      {importConfirm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full rounded-2xl bg-white p-5">
            <h3 className="text-lg font-semibold">导入备份？</h3>
            <p className="mt-1 text-sm text-gray-500">
              导入会用备份文件覆盖当前所有任务和设置，确定继续吗？
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setImportConfirm(null)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-gray-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmImport}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-medium text-white"
              >
                覆盖导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
