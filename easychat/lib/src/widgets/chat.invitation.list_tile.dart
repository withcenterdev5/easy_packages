import 'package:cached_network_image/cached_network_image.dart';
import 'package:easy_helpers/easy_helpers.dart';
import 'package:easychat/easychat.dart';
import 'package:easyuser/easyuser.dart';
import 'package:flutter/material.dart';

/// Chat room invitation list tile.
///
/// Use:
/// - To display the chat room invitation list on top of the chat room list.
/// - You may use it to display the invitation list on home screen.
class ChatInvitationListTile extends StatelessWidget {
  const ChatInvitationListTile({
    super.key,
    required this.room,
    required this.onAccept,
    this.onReject,
  });

  final ChatRoom room;
  final Function(ChatRoom room, User? user)? onAccept;
  final Function(ChatRoom room, User? user)? onReject;

  static const double _minTileHeight = 70;

  static const EdgeInsetsGeometry _contentPadding =
      EdgeInsets.symmetric(horizontal: 16);

  @override
  Widget build(BuildContext context) {
    dog("Initation List tile");
    if (room.single == true) {
      final otherUid = getOtherUserUidFromRoomId(room.id)!;
      return UserBlocked(
          otherUid: otherUid,
          builder: (blocked) {
            if (blocked) {
              return const SizedBox.shrink();
            }
            return UserDoc.sync(
              uid: otherUid,
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
                  subtitle: user?.stateMessage != null &&
                          user!.stateMessage!.isNotEmpty
                      ? Text(
                          user.stateMessage ?? "",
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        )
                      : null,
                  trailing: ChatInvitationListTileActions(
                    onTapAccept: () => onTapAccept(user),
                    onTapReject: () => onTapReject(user),
                  ),
                  contentPadding: _contentPadding,
                );
              },
            );
          });
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
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: ChatInvitationListTileActions(
        onTapAccept: onTapAccept,
        onTapReject: onTapReject,
      ),
      contentPadding: _contentPadding,
    );
  }

  Future onTapAccept([User? user]) async {
    await ChatService.instance.accept(room);
    onAccept?.call(room, user);
  }

  Future onTapReject([User? user]) async {
    await ChatService.instance.reject(room);
    onReject?.call(room, user);
  }
}
