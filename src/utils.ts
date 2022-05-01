import { SPOILER_ATTACHMENT_PREFIX } from './constants';
import { RequestTypes } from './types';


export function spoilerfy(file: RequestTypes.File): RequestTypes.File {
  if (file.filename && !file.filename.startsWith(SPOILER_ATTACHMENT_PREFIX)) {
    file.filename = `${SPOILER_ATTACHMENT_PREFIX}${file.filename}`;
  }
  return file;
}


export const CamelCaseToSnakeCase = Object.freeze({
  ApplicationCommand: (
    options: RequestTypes.CreateApplicationCommand | RequestTypes.toJSON<RequestTypes.CreateApplicationCommandData>,
  ): RequestTypes.CreateApplicationCommandData | RequestTypes.toJSON<RequestTypes.CreateApplicationCommandData> => {
    if ('toJSON' in options) {
      return options;
    }
    return {
      default_member_permissions: options.defaultMemberPermissions && String(options.defaultMemberPermissions),
      default_permission: options.defaultPermission,
      description: options.description,
      description_localizations: options.descriptionLocalizations,
      dm_permission: options.dmPermission,
      id: options.id,
      name: options.name,
      name_localizations: options.nameLocalizations,
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
      max_value: options.maxValue && String(options.maxValue),
      min_value: options.maxValue && String(options.minValue),
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
  InteractionResponseInnerPayload: (
    options: RequestTypes.CreateInteractionResponseInnerPayload,
  ): [RequestTypes.CreateInteractionResponseInnerPayloadData, Array<RequestTypes.File>] => {
    const [ body, files ] = CamelCaseToSnakeCase.MessageEdit(options) as [RequestTypes.CreateInteractionResponseInnerPayloadData, Array<RequestTypes.File>];

    if (options.choices && typeof(options.choices) === 'object') {
      body.choices = options.choices.map((x) => {
        return {name: x.name, name_localizations: x.nameLocalizations, value: x.value};
      });
    }

    body.custom_id = options.customId;
    body.title = options.title;

    return [
      body as RequestTypes.CreateInteractionResponseInnerPayloadData,
      files,
    ];
  },
  MessageCreate: (
    options: RequestTypes.CreateMessage,
  ): [RequestTypes.CreateMessageData, Array<RequestTypes.File>] => {
    const body: RequestTypes.CreateMessageData = {
      application_id: options.applicationId,
      attachments: options.attachments,
      content: options.content,
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
    if (options.components && typeof(options.components) === 'object') {
      if ('toJSON' in options.components) {
        body.components = options.components;
      } else {
        body.components = options.components.map((component) => {
          if ('toJSON' in component) {
            return component;
          }
          return {
            components: component.components && component.components.map((child) => {
              if ('toJSON' in child) {
                return child;
              }
              return {
                custom_id: child.customId,
                disabled: child.disabled,
                emoji: child.emoji,
                label: child.label,
                max_length: child.maxLength,
                max_values: child.maxValues,
                min_length: child.minLength,
                min_values: child.minValues,
                options: child.options,
                placeholder: child.placeholder,
                required: child.required,
                style: child.style,
                type: child.type,
                url: child.url,
                value: child.value,
              };
            }),
            custom_id: component.customId,
            disabled: component.disabled,
            emoji: component.emoji,
            label: component.label,
            max_length: component.maxLength,
            max_values: component.maxValues,
            min_length: component.minLength,
            min_values: component.minValues,
            options: component.options,
            placeholder: component.placeholder,
            required: component.required,
            style: component.style,
            type: component.type,
            url: component.url,
            value: component.value,
          };
        });
      }
    }
    if (options.embed !== undefined) {
      if (options.embed) {
        if (options.embeds) {
          options.embeds = [options.embed, ...options.embeds];
        } else {
          options.embeds = [options.embed];
        }
      } else if (!options.embeds) {
        options.embeds = [];
      }
    }
    if (options.embeds) {
      body.embeds = options.embeds.map((embed) => {
        if ('toJSON' in embed) {
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
      };
    }

    const files: Array<RequestTypes.File> = [];
    if (options.file) {
      files.push(options.file);
    }
    if (options.files && options.files.length) {
      for (let i = 0; i < options.files.length; i++) {
        const file = options.files[i];
        if (file.hasSpoiler) {
          spoilerfy(file);
        }
        if (file.description) {
          if (!body.attachments) {
            body.attachments = [];
          }
          const id = file.key || i;
          body.attachments.push({
            description: file.description,
            filename: file.filename,
            id,
          });
        }
        files.push(file);
      }
    }
    if (options.hasSpoiler) {
      for (let file of files) {
        spoilerfy(file);
      }
    }
    return [body, files];
  },
  MessageEdit: (
    options: RequestTypes.EditMessage,
  ): [RequestTypes.EditMessageData, Array<RequestTypes.File>] => {
    const response = CamelCaseToSnakeCase.MessageCreate(options) as [RequestTypes.EditMessageData, Array<RequestTypes.File>];
    response[0].flags = options.flags;
    return response;
  },
});
