import QuestionDialog from "../components/QuestionDialog.vue";

// A question the reader answers before an action (`docs/components.md`, "Messages"): the library's
// dialog, opened through its overlay over everything standing, never the message pill, which tells
// and never asks. Its words are the caller's, read through its own translator, so the module holds
// none.

export interface QuestionAsked {
  // The question, naming what the action is taken on or throws away.
  title: string;
  // The item the action is taken on, where the question does not already name it.
  item?: string | null;
  // What going through does, where it is more than the question says.
  effect?: string | null;
  // The way through: the action's own verb.
  confirm: string;
  // The way out, the pack's cancel where it is left out.
  cancel?: string;
  // Asked while the page is being left: it holds that navigation, so it takes no entry of the back
  // gesture (the overlays module's `OFF_HISTORY`).
  leaving?: boolean;
}

// Answers whether the reader went through with it. Every way out — its cancel, its close, Esc, a
// press outside, the back gesture — answers no. Each question is a dialog of its own, taken off the
// page once it has gone.
export async function askQuestion(asked: QuestionAsked): Promise<boolean> {
  const overlay = useOverlay();

  return (await overlay.create(QuestionDialog, { props: asked, destroyOnClose: true }).open()) === true;
}
