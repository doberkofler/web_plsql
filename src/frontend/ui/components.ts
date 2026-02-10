/**
 * Enhances a button with loading state logic.
 *
 * @param btn - The button element to enhance.
 * @param action - The async function to execute when the button is clicked.
 * @returns The result of the action.
 */
export async function withLoading<T>(btn: HTMLButtonElement, action: () => Promise<T>): Promise<T> {
	const iconSpan = btn.querySelector('.material-symbols-rounded');
	const originalIcon = iconSpan?.textContent;

	btn.disabled = true;
	btn.classList.add('loading');
	if (iconSpan) {
		iconSpan.textContent = 'sync';
		iconSpan.classList.add('animate-spin');
	}

	try {
		return await action();
	} finally {
		btn.disabled = false;
		btn.classList.remove('loading');
		if (iconSpan) {
			iconSpan.textContent = originalIcon ?? '';
			iconSpan.classList.remove('animate-spin');
		}
	}
}

/**
 * Binds an async action to a button with standardized loading feedback.
 *
 * @param id - The ID of the button element.
 * @param action - The async action to perform.
 * @returns The button element or null if not found.
 */
export function bindLoadingButton(id: string, action: () => Promise<void>): HTMLButtonElement | null {
	const btn = document.getElementById(id) as HTMLButtonElement | null;
	if (btn) {
		btn.onclick = () => void withLoading(btn, action);
	}
	return btn;
}
