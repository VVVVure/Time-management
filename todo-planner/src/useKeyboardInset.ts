import { useEffect, useState } from 'react';

/**
 * 估算 iOS 软键盘在视觉视口里露出来的高度。
 * 用于把固定在底部的输入栏往上抬，避免被键盘挡住。
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const update = () => {
      setInset(Math.max(0, window.innerHeight - vv.offsetTop - vv.height));
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return inset;
}
