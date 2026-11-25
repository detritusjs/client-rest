import { isBlob } from 'detritus-rest/lib/is';

import { bufferToBase64 } from './clientsidechecks';
import { SPOILER_ATTACHMENT_PREFIX } from './constants';
import { RequestTypes } from './types';


/**
 * Mutates `file`, pass a copy if the caller's object shouldn't change
 */
export function spoilerfy(file: RequestTypes.File): RequestTypes.File {
  // detritus-rest falls back to a `File`'s name when there's no `filename`
  const filename = file.filename || ((isBlob(file.value) && typeof(file.value.name) === 'string') ? file.value.name : '');
  if (filename && !filename.startsWith(SPOILER_ATTACHMENT_PREFIX)) {
    file.filename = `${SPOILER_ATTACHMENT_PREFIX}${filename}`;
  }
  return file;
}


/**
 * Turns every bigint inside plain objects and arrays into a string, `JSON.stringify` throws on them
 * copies only the objects on the way to a bigint, class instances (`toJSON` builders, buffers, blobs) are left alone
 */
export function stringifyBigInts<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (typeof(value) === 'bigint') {
    return String(value) as any;
  }
  if (value === null || typeof(value) !== 'object' || seen.has(value as any)) {
    // a circular reference is left for `JSON.stringify` to throw on
    return value;
  }
  if (Array.isArray(value)) {
    seen.add(value);
    let copy: Array<any> | null = null;
    for (let i = 0; i < value.length; i++) {
      const converted = stringifyBigInts(value[i], seen);
      if (converted !== value[i]) {
        if (!copy) {
          copy = value.slice();
        }
        copy[i] = converted;
      }
    }
    return (copy || value) as any;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }
  seen.add(value as any);
  let copy: Record<string, any> | null = null;
  for (let key in value) {
    const original = (value as any)[key];
    const converted = stringifyBigInts(original, seen);
    if (converted !== original) {
      if (!copy) {
        copy = Object.assign({}, value);
      }
      copy[key] = converted;
    }
  }
  return (copy || value) as any;
}


export const CamelCaseToSnakeCase = Object.freeze({
  _File: (
    file: RequestTypes.File,
    fileId: number,
    hasSpoiler?: boolean,
  ): [RequestTypes.File, {
    description?: string,
    duration_secs?: number,
    filename?: string,
    id: number | string,
    is_spoiler?: boolean,
    title?: string,
    waveform?: string,
  } | null]=> {
    let attachment: {
      description?: string,
      duration_secs?: number,
      filename?: string,
      id: number | string,
      is_spoiler?: boolean,
      title?: string,
      waveform?: string,
    } | null = null;

    if (file.hasSpoiler || hasSpoiler) {
      file = spoilerfy(Object.assign({}, file));
    }
    if (file.description || file.durationSecs || file.isSpoiler !== undefined || file.title || file.waveform) {
      attachment = {
        description: file.description,
        duration_secs: file.durationSecs,
        filename: file.filename,
        id: CamelCaseToSnakeCase._FileId(file, fileId),
        is_spoiler: file.isSpoiler,
        title: file.title,
        waveform: file.waveform,
      };
    }
    return [file, attachment];
  },
  /**
   * The attachment id has to match the multipart field `files[n]`, a custom `files[n]` key wins over the position
   */
  _FileId: (file: RequestTypes.File, fileId: number): number => {
    if (file.key) {
      const match = /^files\[(\d+)\]$/.exec(file.key);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return fileId;
  },
  /**
   * Adds every file to `body.attachments` once anything needs that array, discord drops files missing from it
   */
  _MessageFiles: (
    body: {attachments?: Array<any>},
    options: {file?: RequestTypes.File, files?: Array<RequestTypes.File>, hasSpoiler?: boolean},
  ): Array<RequestTypes.File> => {
    const files: Array<RequestTypes.File> = [];
    const attachments: Array<{filename?: string, id: number | string, [key: string]: any}> = [];
    let hasMetadata = false;

    const add = (raw: RequestTypes.File) => {
      const fileId = files.length;
      const [ file, attachment ] = CamelCaseToSnakeCase._File(raw, fileId, options.hasSpoiler);
      files.push(file);
      if (attachment) {
        hasMetadata = true;
        attachments.push(attachment);
      } else {
        attachments.push({filename: file.filename, id: CamelCaseToSnakeCase._FileId(file, fileId)});
      }
    };
    if (options.file) {
      add(options.file);
    }
    if (options.files) {
      for (let file of options.files) {
        add(file);
      }
    }

    if (attachments.length && (hasMetadata || body.attachments)) {
      if (body.attachments) {
        // the caller's `attachments` can already describe an uploaded file (like alt text), fill that entry in
        const merged = body.attachments.slice();
        for (let attachment of attachments) {
          const index = merged.findIndex((x) => {
            const id = ('toJSON' in x) ? x.toJSON().id : x.id;
            return id !== undefined && id !== null && String(id) === String(attachment.id);
          });
          if (index === -1) {
            merged.push(attachment);
          } else if (!('toJSON' in merged[index])) {
            const entry = Object.assign({}, attachment);
            for (let key in merged[index]) {
              if (merged[index][key] !== undefined) {
                entry[key] = merged[index][key];
              }
            }
            merged[index] = entry;
          }
        }
        body.attachments = merged;
      } else {
        body.attachments = attachments;
      }
    }
    return files;
  },
  _ChannelOverwrite: <T extends {allow?: bigint | number | string, deny?: bigint | number | string}>(
    overwrite: T,
  ): T & {allow?: string, deny?: string} => {
    // JSON.stringify can't serialize BigInts, and numbers lose precision past 2^53
    return Object.assign({}, overwrite, {
      allow: (overwrite.allow !== undefined && overwrite.allow !== null) ? String(overwrite.allow) : overwrite.allow,
      deny: (overwrite.deny !== undefined && overwrite.deny !== null) ? String(overwrite.deny) : overwrite.deny,
    }) as T & {allow?: string, deny?: string};
  },
  _GuildChannel: (
    options: RequestTypes.CreateGuildChannel & {id?: number | string},
  ) => {
    return {
      available_tags: options.availableTags && options.availableTags.map((tag) => {
        return {
          emoji_id: tag.emojiId,
          emoji_name: tag.emojiName,
          id: tag.id,
          moderated: tag.moderated,
          name: tag.name,
        };
      }),
      branch_id: options.branchId,
      bitrate: options.bitrate,
      default_auto_archive_duration: options.defaultAutoArchiveDuration,
      default_forum_layout: options.defaultForumLayout,
      default_reaction_emoji: (options.defaultReactionEmoji) ? {
        emoji_id: options.defaultReactionEmoji.emojiId,
        emoji_name: options.defaultReactionEmoji.emojiName,
      } : options.defaultReactionEmoji,
      default_sort_order: options.defaultSortOrder,
      default_thread_rate_limit_per_user: options.defaultThreadRateLimitPerUser,
      flags: options.flags,
      // only used by `createGuild`, placeholder ids that `parent_id` and other channels can reference
      id: options.id,
      name: options.name,
      nsfw: options.nsfw,
      parent_id: options.parentId,
      permission_overwrites: options.permissionOverwrites && options.permissionOverwrites.map((overwrite) => {
        return CamelCaseToSnakeCase._ChannelOverwrite(overwrite);
      }),
      position: options.position,
      rate_limit_per_user: options.rateLimitPerUser,
      rtc_region: options.rtcRegion,
      sku_id: options.skuId,
      topic: options.topic,
      type: options.type,
      user_limit: options.userLimit,
      video_quality_mode: options.videoQualityMode,
    };
  },
  _GuildRole: (
    options: RequestTypes.CreateGuildRole & {id?: number | string},
  ) => {
    return {
      color: options.color,
      colors: CamelCaseToSnakeCase._RoleColors(options.colors),
      hoist: options.hoist,
      icon: bufferToBase64(options.icon),
      // only used by `createGuild`, placeholder ids that channel overwrites can reference
      id: options.id,
      mentionable: options.mentionable,
      name: options.name,
      permissions: (options.permissions !== undefined && options.permissions !== null) ? String(options.permissions) : options.permissions,
      unicode_emoji: options.unicodeEmoji,
    };
  },
  _GuildScheduledEventRecurrenceRule: (
    rule: RequestTypes.GuildScheduledEventRecurrenceRule,
  ): RequestTypes.GuildScheduledEventRecurrenceRuleData => {
    return {
      by_month: rule.byMonth,
      by_month_day: rule.byMonthDay,
      by_n_weekday: rule.byNWeekday,
      by_weekday: rule.byWeekday,
      frequency: rule.frequency,
      interval: rule.interval,
      start: rule.start,
    };
  },
  LobbyMember: (
    member: RequestTypes.LobbyMember & {removeMember?: boolean},
  ) => {
    return {
      additional_name: member.additionalName,
      flags: member.flags,
      id: member.id,
      metadata: member.metadata,
      remove_member: member.removeMember,
    };
  },
  GuildOnboardingPrompt: (
    prompt: RequestTypes.GuildOnboardingPrompt,
  ) => {
    return {
      id: prompt.id,
      in_onboarding: prompt.inOnboarding,
      options: prompt.options.map((option) => {
        return {
          channel_ids: option.channelIds,
          description: option.description,
          emoji_animated: option.emojiAnimated,
          emoji_id: option.emojiId,
          emoji_name: option.emojiName,
          id: option.id,
          role_ids: option.roleIds,
          title: option.title,
        };
      }),
      required: prompt.required,
      single_select: prompt.singleSelect,
      title: prompt.title,
      type: prompt.type,
    };
  },
  _RoleColors: (
    colors?: RequestTypes.CreateGuildRole['colors'],
  ) => {
    return colors && {
      primary_color: colors.primaryColor,
      secondary_color: colors.secondaryColor,
      tertiary_color: colors.tertiaryColor,
    };
  },
  _Poll: (
    poll: NonNullable<RequestTypes.CreateMessage['poll']>,
  ): NonNullable<RequestTypes.CreateMessageData['poll']> => {
    return {
      allow_multiselect: poll.allowMultiselect,
      answers: poll.answers && poll.answers.map((answer) => {
        return {
          poll_media: answer.pollMedia && {
            attachment_ids: answer.pollMedia.attachmentIds,
            emoji: answer.pollMedia.emoji,
            text: answer.pollMedia.text,
          },
        };
      }),
      duration: poll.duration,
      layout_type: poll.layoutType,
      question: poll.question && {
        emoji: poll.question.emoji,
        text: poll.question.text,
      },
    };
  },
  ApplicationCommand: (
    options: RequestTypes.CreateApplicationCommand |RequestTypes.toJSON<RequestTypes.CreateApplicationCommandData>,
  ): RequestTypes.CreateApplicationCommandData | RequestTypes.toJSON<RequestTypes.CreateApplicationCommandData> => {
    if ('toJSON' in options) {
      return options;
    }
    return {
      contexts: options.contexts,
      default_member_permissions: (options.defaultMemberPermissions == null) ? options.defaultMemberPermissions : String(options.defaultMemberPermissions),
      default_permission: options.defaultPermission,
      description: options.description,
      description_localizations: options.descriptionLocalizations,
      dm_permission: options.dmPermission,
      handler: options.handler,
      id: options.id,
      integration_types: options.integrationTypes,
      name: options.name,
      name_localizations: options.nameLocalizations,
      nsfw: options.nsfw,
      options: options.options && options.options.map((option) => CamelCaseToSnakeCase.ApplicationCommandOption(option)),
      type: options.type,
    };
  },
  ApplicationCommandOption: (
    options: RequestTypes.CreateApplicationCommandOption | RequestTypes.toJSON<RequestTypes.CreateApplicationCommandOptionData>,
  ): RequestTypes.CreateApplicationCommandOptionData | RequestTypes.toJSON<RequestTypes.CreateApplicationCommandOptionData> => {
    if ('toJSON' in options) {
      return options;
    }
    return {
      autocomplete: options.autocomplete,
      channel_types: options.channelTypes,
      choices: options.choices && options.choices.map((x) => {
        return {name: x.name, name_localizations: x.nameLocalizations, value: x.value};
      }),
      description: options.description,
      description_localizations: options.descriptionLocalizations,
      file_types: options.fileTypes,
      max_length: options.maxLength,
      max_value: (options.maxValue == null) ? options.maxValue : String(options.maxValue),
      min_length: options.minLength,
      min_value: (options.minValue == null) ? options.minValue : String(options.minValue),
      name: options.name,
      name_localizations: options.nameLocalizations,
      options: options.options && options.options.map((x) => CamelCaseToSnakeCase.ApplicationCommandOption(x)),
      required: options.required,
      type: options.type,
    };
  },
  ApplicationCommandPermission: (
    options: RequestTypes.EditApplicationGuildCommandPermission | RequestTypes.toJSON<RequestTypes.EditApplicationGuildCommandPermissionData>,
  ): RequestTypes.EditApplicationGuildCommandPermissionData | RequestTypes.toJSON<RequestTypes.EditApplicationGuildCommandPermissionData> => {
    if ('toJSON' in options) {
      return options;
    }
    return {
      id: String(options.id),
      permission: options.permission,
      type: options.type,
    };
  },
  ApplicationRoleConnectionsMetadataRecord: (
    options: RequestTypes.BulkOverwriteApplicationRoleConnectionsMetadataRecord | RequestTypes.toJSON<RequestTypes.BulkOverwriteApplicationRoleConnectionsMetadataRecordData>,
  ): RequestTypes.BulkOverwriteApplicationRoleConnectionsMetadataRecordData | RequestTypes.toJSON<RequestTypes.BulkOverwriteApplicationRoleConnectionsMetadataRecordData> => {
    if ('toJSON' in options) {
      return options;
    }
    return {
      description: options.description,
      description_localizations: options.descriptionLocalizations,
      key: options.key,
      name: options.name,
      name_localizations: options.nameLocalizations,
      type: options.type,
    };
  },
  InteractionResponseInnerPayload: (
    options: RequestTypes.CreateInteractionResponseInnerPayload,
  ): [RequestTypes.CreateInteractionResponseInnerPayloadData, Array<RequestTypes.File>] => {
    const [ body, files ] = CamelCaseToSnakeCase.MessageEdit(options) as [RequestTypes.CreateInteractionResponseInnerPayloadData, Array<RequestTypes.File>];

    if (options.choices && typeof(options.choices) === 'object') {
      body.choices = options.choices.map((x) => {
        return {name: x.name, name_localizations: x.nameLocalizations, value: x.value};
      });
    }

    if (options.poll && typeof(options.poll) === 'object') {
      body.poll = CamelCaseToSnakeCase._Poll(options.poll);
    }

    body.custom_id = options.customId;
    body.title = options.title;

    return [
      body as RequestTypes.CreateInteractionResponseInnerPayloadData,
      files,
    ];
  },
  MessageComponent: (
    component: RequestTypes.CreateChannelMessageComponent | RequestTypes.toJSON<RequestTypes.RawChannelMessageComponent>,
  ): RequestTypes.RawChannelMessageComponent | RequestTypes.toJSON<RequestTypes.RawChannelMessageComponent> => {
    if ('toJSON' in component) {
      return component;
    }
    return {
      accent_color: component.accentColor,
      accessory: component.accessory && CamelCaseToSnakeCase.MessageComponent(component.accessory),
      channel_types: component.channelTypes,
      component: component.component && CamelCaseToSnakeCase.MessageComponent(component.component),
      components: component.components && component.components.map((child) => CamelCaseToSnakeCase.MessageComponent(child)),
      content: component.content,
      custom_id: component.customId,
      default: component.default,
      default_values: component.defaultValues,
      description: component.description,
      disabled: component.disabled,
      divider: component.divider,
      emoji: component.emoji,
      file: component.file && {
        url: component.file.url,
      },
      file_types: component.fileTypes,
      groups: component.groups && component.groups.map((group) => {
        return {
          components: group.components && group.components.map((child) => CamelCaseToSnakeCase.MessageComponent(child)),
          label: group.label,
        };
      }),
      id: component.id,
      items: component.items && component.items.map((item) => {
        return {
          description: item.description,
          media: item.media && {
            url: item.media.url,
          },
          spoiler: item.spoiler,
        };
      }),
      label: component.label,
      max_length: component.maxLength,
      max_values: component.maxValues,
      media: component.media && {
        url: component.media.url,
      },
      min_length: component.minLength,
      min_values: component.minValues,
      options: component.options,
      placeholder: component.placeholder,
      required: component.required,
      sku_id: component.skuId,
      spacing: component.spacing,
      spoiler: component.spoiler,
      style: component.style,
      type: component.type,
      url: component.url,
      value: component.value,
    };
  },
  MessageCreate: (
    options: RequestTypes.CreateMessage,
  ): [RequestTypes.CreateMessageData, Array<RequestTypes.File>] => {
    const body: RequestTypes.CreateMessageData = {
      application_id: options.applicationId,
      content: options.content,
      enforce_nonce: options.enforceNonce,
      flags: options.flags,
      nonce: options.nonce,
      sticker_ids: options.stickerIds,
      tts: options.tts,
    };

    if (options.activity && typeof(options.activity) === 'object') {
      body.activity = {
        party_id: options.activity.partyId,
        session_id: options.activity.sessionId,
        type: options.activity.type,
      };
    }
    if (options.allowedMentions && typeof(options.allowedMentions) === 'object') {
      body.allowed_mentions = {
        parse: options.allowedMentions.parse,
        replied_user: options.allowedMentions.repliedUser,
        roles: options.allowedMentions.roles,
        users: options.allowedMentions.users,
      };
    }
    if (options.attachments) {
      body.attachments = options.attachments.map((attachment) => {
        if ('toJSON' in attachment) {
          return attachment;
        }
        return {
          description: attachment.description,
          duration_secs: attachment.durationSecs,
          filename: attachment.filename,
          id: attachment.id,
          is_spoiler: attachment.isSpoiler,
          original_content_type: attachment.originalContentType,
          title: attachment.title,
          uploaded_filename: attachment.uploadedFilename,
          waveform: attachment.waveform,
        };
      });
    }
    if (options.components && typeof(options.components) === 'object') {
      if ('toJSON' in options.components) {
        body.components = options.components;
      } else {
        body.components = options.components.map((component) => CamelCaseToSnakeCase.MessageComponent(component));
      }
    }
    let embeds = options.embeds;
    if (options.embed !== undefined) {
      if (options.embed) {
        if (embeds) {
          embeds = [options.embed, ...embeds];
        } else {
          embeds = [options.embed];
        }
      } else if (!embeds) {
        embeds = [];
      }
    }
    if (embeds && !Array.isArray(embeds)) {
      body.embeds = embeds as any;
    } else if (embeds) {
      body.embeds = embeds.map((embed) => {
        if (!embed || typeof(embed) !== 'object' || 'toJSON' in embed) {
          return embed;
        }
        const raw = Object.assign({}, embed) as RequestTypes.RawChannelMessageEmbed;
        if (embed.author && typeof(embed.author) === 'object') {
          raw.author = {
            name: embed.author.name,
            url: embed.author.url,
            icon_url: embed.author.iconUrl,
          };
        }
        if (embed.footer && typeof(embed.footer) === 'object') {
          raw.footer = {
            text: embed.footer.text,
            icon_url: embed.footer.iconUrl,
          };
        }
        return raw;
      });
    }
    if (options.messageReference && typeof(options.messageReference) === 'object') {
      body.message_reference = {
        channel_id: options.messageReference.channelId,
        fail_if_not_exists: options.messageReference.failIfNotExists,
        guild_id: options.messageReference.guildId,
        message_id: options.messageReference.messageId,
        type: options.messageReference.type,
      };
    }
    if (options.poll && typeof(options.poll) === 'object') {
      body.poll = CamelCaseToSnakeCase._Poll(options.poll);
    }

    const files = CamelCaseToSnakeCase._MessageFiles(body, options);
    return [body, files];
  },
  MessageEdit: (
    options: RequestTypes.EditMessage,
  ): [RequestTypes.EditMessageData, Array<RequestTypes.File>] => {
    return CamelCaseToSnakeCase.MessageCreate(options) as [RequestTypes.EditMessageData, Array<RequestTypes.File>];
  },
});
