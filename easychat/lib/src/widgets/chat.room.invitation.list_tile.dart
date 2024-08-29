import 'package:cached_network_image/cached_network_image.dart';
import 'package:easy_locale/easy_locale.dart';
import 'package:easychat/easychat.dart';
import 'package:easyuser/easyuser.dart';
import 'package:flutter/material.dart';

class ChatRoomInvitationListTile extends StatelessWidget {
  const ChatRoomInvitationListTile({
    super.key,
    required this.room,
    this.onAccept,
    this.onReject,
  });

  final ChatRoom room;
  final Function(ChatRoom room, User? user)? onAccept;
  final Function(ChatRoom room, User? user)? onReject;

  static const double _minTileHeight = 70;

  static const EdgeInsetsGeometry _contentPadding =
      EdgeInsets.symmetric(horizontal: 16);

  onTapAccept([User? user]) async {
    onAccept?.call(room, user);
    await room.acceptInvitation();
  }

  onTapReject([User? user]) async {
    onReject?.call(room, user);
    await room.rejectInvitation();
  }

  @override
  Widget build(BuildContext context) {
    if (room.single) {
      return UserDoc.sync(
        uid: getOtherUserUidFromRoomId(room.id)!,
        builder: (user) {
          return ListTile(
            minTileHeight: _minTileHeight,
            leading: GestureDetector(
              onTap: () => UserService.instance.showPublicProfileScreen(
                context,
                user: user!,
              ),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  color: Theme.of(context).colorScheme.tertiaryContainer,
                ),
                width: 48,
                height: 48,
                clipBehavior: Clip.hardEdge,
                child: user == null
                    ? const Icon(Icons.person)
                    : UserAvatar(user: user),
              ),
            ),
            title: Text(
              user?.displayName ?? "...",
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle:
                user?.stateMessage != null && user!.stateMessage!.isNotEmpty
                    ? Text(
                        user.stateMessage ?? "",
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      )
                    : null,
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                ElevatedButton(
                  onPressed: () async => onTapAccept(user),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.all(12),
                  ),
                  child: Text("accept".t),
                ),
                const SizedBox(width: 4),
                ElevatedButton(
                  onPressed: () => onTapReject(user),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.all(12),
                  ),
                  child: Text("reject".t),
                ),
              ],
            ),
            contentPadding: _contentPadding,
          );
        },
      );
    }

    // else, it means it is a group chat
    return ListTile(
      minTileHeight: _minTileHeight,
      leading: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: Theme.of(context).colorScheme.tertiaryContainer,
        ),
        width: 48,
        height: 48,
        clipBehavior: Clip.hardEdge,
        child: room.iconUrl != null && room.iconUrl!.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: room.iconUrl!,
                fit: BoxFit.cover,
              )
            : Icon(
                Icons.people,
                color: Theme.of(context).colorScheme.onTertiaryContainer,
              ),
      ),
      title: Text(
        room.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        room.description,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ElevatedButton(
            onPressed: onTapAccept,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.all(12),
            ),
            child: Text("accept".t),
          ),
          const SizedBox(width: 4),
          ElevatedButton(
            onPressed: onTapReject,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.all(12),
            ),
            child: Text("reject".t),
          ),
        ],
      ),
      contentPadding: _contentPadding,
    );
  }
}
