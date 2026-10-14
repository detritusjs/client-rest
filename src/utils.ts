import { SPOILER_ATTACHMENT_PREFIX } from './constants';
import { RequestTypes } from './types';


export function spoilerfy(file: RequestTypes.File): RequestTypes.File {
  if (file.filename && !file.filename.startsWith(SPOILER_ATTACHMENT_PREFIX)) {
    file.filename = `${SPOILER_ATTACHMENT_PREFIX}${file.filename}`;
  }
  return file;
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
    waveform?: string,
  } | null]=> {
    let attachment: {
      description?: string,
      duration_secs?: number,
      filename?: string,
      id: number | string,
      waveform?: string,
    } | null = null;

    if (file.hasSpoiler || hasSpoiler) {
      file = spoilerfy(Object.assign({}, file));
    }
    if (file.description || file.durationSecs || file.waveform) {
      attachment = {
        description: file.description,
        duration_secs: file.durationSecs,
        filename: file.filename,
        id: fileId,
        waveform: file.waveform,
      };
    }
    return [file, attachment];
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
          original_content_type: attachment.originalContentType,
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
        if (typeof(embed.author) === 'object') {
          raw.author = {
            name: embed.author.name,
            url: embed.author.url,
            icon_url: embed.author.iconUrl,
          };
        }
        if (typeof(embed.footer) === 'object') {
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

    const files: Array<RequestTypes.File> = [];
    if (options.file) {
      const [ file, attachment ] = CamelCaseToSnakeCase._File(options.file, 0, options.hasSpoiler);
      files.push(file);
      if (attachment) {
        if (body.attachments) {
          body.attachments.push(attachment);
        } else {
          body.attachments = [attachment];
        }
      }
    }

    if (options.files && options.files.length) {
      const fileIdStart = files.length;
      for (let i = 0; i < options.files.length; i++) {
        const [ file, attachment ] = CamelCaseToSnakeCase._File(options.files[i], i + fileIdStart, options.hasSpoiler);
        files.push(file);
        if (attachment) {
          if (body.attachments) {
            body.attachments.push(attachment);
          } else {
            body.attachments = [attachment];
          }
        }
      }
    }

    return [body, files];
  },
  MessageEdit: (
    options: RequestTypes.EditMessage,
  ): [RequestTypes.EditMessageData, Array<RequestTypes.File>] => {
    return CamelCaseToSnakeCase.MessageCreate(options) as [RequestTypes.EditMessageData, Array<RequestTypes.File>];
  },
});
