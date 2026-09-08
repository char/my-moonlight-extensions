import {
  CommandType,
  InputType,
  OptionType,
  type StringCommandOption
} from "@moonlight-mod/types/coreExtensions/commands";
import Commands from "@moonlight-mod/wp/commands_commands";
import { ChannelStore, SelectedChannelStore, UserStore } from "@moonlight-mod/wp/common_stores";
import { addItem, MenuItem } from "@moonlight-mod/wp/contextMenu_contextMenu";
import Notices from "@moonlight-mod/wp/notices_notices";
import React from "@moonlight-mod/wp/react";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import { COMMITMENT_PATTERN, createCommitment, formatReveal, sha256 } from "../commitment";

const MessageActions = spacepack.findObjectFromKey(
  spacepack.findByCode("},sendExplicitMediaClydeError(")[0].exports,
  "sendMessage"
);

function storageKey(userId: string, channelId: string, digest: string): string {
  return `precommit:v1:${userId}:${channelId}:${digest}`;
}

function showError(message: string) {
  Notices.addNotice({ element: `Precommit: ${message}`, showClose: true });
}

async function send(userId: string, channelId: string, content: string, messageId?: string) {
  // Hashing yields to the event loop; never send a saved secret after an account switch.
  if (UserStore.getCurrentUser()?.id !== userId) throw new Error("Account changed.");
  return MessageActions.sendMessage(
    channelId,
    { content, tts: false, invalidEmojis: [], validNonShortcutEmojis: [] },
    true,
    {
      allowedMentions: { parse: [], replied_user: false },
      ...(messageId
        ? {
            messageReference: {
              message_id: messageId,
              channel_id: channelId,
              guild_id: ChannelStore.getChannel(channelId)?.guild_id
            }
          }
        : {})
    }
  );
}

Commands.registerCommand({
  id: "precommit",
  description: "Publish a hash of locally saved plaintext to reveal later",
  type: CommandType.CHAT,
  // Send explicitly so errors can never fall back to sending the command's plaintext.
  inputType: InputType.BUILT_IN,
  options: [
    {
      name: "plaintext",
      description: "The secret to commit to (saved locally until you reveal it)",
      type: OptionType.STRING,
      required: true
    }
  ],
  execute: async (options) => {
    const userId = UserStore.getCurrentUser()?.id;
    const channelId = SelectedChannelStore.getChannelId();
    if (!userId || !channelId) return showError("Select a channel while logged in first.");

    let commitment: Awaited<ReturnType<typeof createCommitment>>;
    try {
      const plaintext = options.find(
        (option): option is StringCommandOption => option.name === "plaintext" && option.type === OptionType.STRING
      )?.value;
      commitment = await createCommitment(plaintext ?? "");
    } catch (error) {
      return showError(error instanceof Error ? error.message : "Could not create the commitment.");
    }

    const { digest, payload } = commitment;
    try {
      // Persist before publishing: an unrecoverable commitment is useless.
      moonlight.localStorage.setItem(storageKey(userId, channelId, digest), payload);
    } catch {
      return showError("Could not save the plaintext locally. Nothing was sent.");
    }

    try {
      await send(userId, channelId, `sha256: ${digest}`);
    } catch {
      showError("Could not send the commitment. Its plaintext is still saved locally.");
    }
  }
});

type Message = { id: string; channel_id: string; content: string; author: { id: string } };
const revealing = new Set<string>();

addItem(
  "message",
  ({ message }: { message?: Message }) => {
    const userId = UserStore.getCurrentUser()?.id;
    if (!message || !userId || message.author.id !== userId) return null;
    const digest = COMMITMENT_PATTERN.exec(message.content)?.[1];
    if (!digest) return null;

    const key = storageKey(userId, message.channel_id, digest);
    let saved = false;
    try {
      saved = moonlight.localStorage.getItem(key) !== null;
    } catch {
      // Keep a broken storage backend from breaking the message menu.
    }

    return (
      <MenuItem
        id="precommit-reveal"
        label={saved ? "Reveal commitment" : "Reveal commitment (not saved on this device)"}
        disabled={!saved || revealing.has(message.id)}
        action={async () => {
          if (revealing.has(message.id)) return;
          revealing.add(message.id);
          try {
            const payload = moonlight.localStorage.getItem(key);
            if (payload === null) return showError("This commitment is no longer saved on this device.");
            if ((await sha256(payload)) !== digest) {
              return showError("The saved plaintext does not match this hash. Nothing was revealed.");
            }
            await send(userId, message.channel_id, formatReveal(payload), message.id);
          } catch {
            showError("Could not reveal the commitment. The saved plaintext has been kept; you can retry.");
          } finally {
            revealing.delete(message.id);
          }
        }}
      />
    );
  },
  "reply",
  true
);
