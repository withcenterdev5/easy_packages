import 'package:cloud_firestore/cloud_firestore.dart' as fs;
import 'package:easy_locale/easy_locale.dart';
import 'package:easychat/easychat.dart';
import 'package:easychat/src/chat.locale.dart';
import 'package:easyuser/easyuser.dart';
import 'package:firebase_database/firebase_database.dart' as db;
import 'package:flutter/material.dart';

/// Chat Service
///
/// This is the chat service class that will be used to manage the chat rooms.
class ChatService {
  static ChatService? _instance;
  static ChatService get instance => _instance ??= ChatService._();

  ChatService._() {
    applyChatLocales();
  }

  /// Whether the service is initialized or not.
  ///
  /// Note that, chat service can be initialized multiple times.
  bool initialized = false;

  /// Callback function
  Future<void> Function({BuildContext context, bool openGroupChatsOnly})?
      $showChatRoomListScreen;
  Future<fs.DocumentReference> Function({BuildContext context})?
      $showChatRoomEditScreen;

  /// Add extra widget on chatroom,. eg. push notification toggle button
  Widget Function(ChatRoom)? chatRoomActionButton;

  /// Callback on chatMessage send, use this if you want to do task after message is created., eg. push notification
  /// Callback will have the new [ChatMessage] information
  Function({required ChatMessage message, required ChatRoom room})?
      onSendMessage;

  /// Callback on after userInvite. Can be use if you want to do task after invite. eg. send push notification
  /// [room] current room
  /// [uid] uid of the user that is being invited
  Function({required ChatRoom room, required String uid})? onInvite;

  init({
    Future<void> Function({BuildContext context, bool openGroupChatsOnly})?
        $showChatRoomListScreen,
    Future<fs.DocumentReference> Function({BuildContext context})?
        $showChatRoomEditScreen,
    Widget Function(ChatRoom)? chatRoomActionButton,
    Function({required ChatMessage message, required ChatRoom room})?
        onSendMessage,
    Function({required ChatRoom room, required String uid})? onInvite,
  }) {
    UserService.instance.init();

    initialized = true;

    this.$showChatRoomListScreen =
        $showChatRoomListScreen ?? this.$showChatRoomListScreen;
    this.$showChatRoomEditScreen =
        $showChatRoomEditScreen ?? this.$showChatRoomEditScreen;
    this.chatRoomActionButton = chatRoomActionButton;
    this.onSendMessage = onSendMessage;
    this.onInvite = onInvite;
  }

  /// Firebase CollectionReference for Chat Room docs
  fs.CollectionReference get roomCol =>
      fs.FirebaseFirestore.instance.collection('chat-rooms');

  /// Firebase chat collection query by new message counter for the current user.
  fs.Query get myRoomQuery => roomCol.orderBy(
      '${ChatRoom.field.users}.$myUid.${ChatRoomUser.field.newMessageCounter}');

  /// CollectionReference for Chat Room Meta docs
  fs.CollectionReference roomMetaCol(String roomId) =>
      fs.FirebaseFirestore.instance
          .collection('chat-rooms')
          .doc(roomId)
          .collection('chat-room-meta');

  /// DocumentReference for chat room private settings.
  fs.DocumentReference roomPrivateDoc(String roomId) =>
      roomMetaCol(roomId).doc('private');

  db.DatabaseReference messageRef(String roomId) =>
      db.FirebaseDatabase.instance.ref().child("chat-messages").child(roomId);

  /// Show the chat room list screen.
  Future showChatRoomListScreen(BuildContext context,
      {ChatRoomListOption queryOption = ChatRoomListOption.allMine}) {
    return $showChatRoomListScreen?.call() ??
        showGeneralDialog(
          context: context,
          pageBuilder: (_, __, ___) => ChatRoomListScreen(
            queryOption: queryOption,
          ),
        );
  }

  Future showOpenChatRoomListScreen(BuildContext context) {
    return $showChatRoomListScreen?.call(
          context: context,
          openGroupChatsOnly: true,
        ) ??
        showGeneralDialog(
          context: context,
          pageBuilder: (_, __, ___) => const ChatRoomListScreen(
            queryOption: ChatRoomListOption.open,
          ),
        );
  }

  /// Show the chat room edit screen. It's for borth create and update.
  Future<fs.DocumentReference?> showChatRoomEditScreen(BuildContext context,
      {ChatRoom? room}) {
    return $showChatRoomEditScreen?.call(context: context) ??
        showGeneralDialog<fs.DocumentReference>(
          context: context,
          pageBuilder: (_, __, ___) => ChatRoomEditScreen(room: room),
        );
  }

  showChatRoomScreen(BuildContext context, {User? user, ChatRoom? room}) {
    return showGeneralDialog(
      context: context,
      barrierLabel: "Chat Room",
      pageBuilder: (_, __, ___) => ChatRoomScreen(
        user: user,
        room: room,
      ),
    );
  }

  showRejectListScreen(
    BuildContext context,
  ) {
    return showGeneralDialog(
      context: context,
      pageBuilder: (_, __, ___) => const RejectedChatRoomInviteListScreen(),
    );
  }

  Future sendMessage(
    ChatRoom room, {
    String? photoUrl,
    String? text,
    ChatMessage? replyTo,
  }) async {
    if ((text ?? "").isEmpty && (photoUrl == null || photoUrl.isEmpty)) return;
    await _shouldBeOrBecomeMember(room);
    final newMessage = await ChatMessage.create(
      roomId: room.id,
      text: text,
      url: photoUrl,
      replyTo: replyTo,
    );
    await room.updateNewMessagesMeta(
      lastMessageId: newMessage.id,
      lastMessageText: text,
      lastMessageUrl: photoUrl,
    );
    onSendMessage?.call(message: newMessage, room: room);
  }

  Future updateMessage({
    required ChatMessage message,
    String? text,
    String? url,
    bool isEdit = false,
  }) async {
    // Need to review this. Review how can we simply pass by reference
    // Need to get room here because room may not be latest.
    // However, updating happens occasionally and
    // wont cost much read counts.
    final latestRoom = await ChatRoom.get(message.roomId!);

    final futures = [
      latestRoom!.mayUpdateLastMessage(
        messageId: message.id,
        updatedMessageText: text,
        updatedMessageUrl: url,
      ),
      message.update(
        text: text,
        url: url,
        isEdit: isEdit,
      )
    ];
    await Future.wait(futures);
  }

  Future deleteMessage(
    ChatMessage message,
  ) async {
    // Need to get room here because room may not be latest.
    // However, deleting happens occasionally and
    // wont cost much read counts.
    final latestRoom = await ChatRoom.get(message.roomId!);
    await latestRoom!.mayDeleteLastMessage(message.id);
    await message.delete();
  }

  _shouldBeOrBecomeMember(
    ChatRoom room,
  ) async {
    if (room.joined) return;
    if (room.open) return await room.join();
    if (room.invitedUsers.contains(myUid!) ||
        room.rejectedUsers.contains(myUid!)) {
      // The user may mistakenly reject the chat room
      // The user may accept it by replying.
      return await room.acceptInvitation();
    }
    throw ChatException(
      "uninvited-chat",
      'can only send message if member, invited or open chat'.t,
    );
  }

  Future<void> showEditMessageDialog(
    BuildContext context, {
    required ChatMessage message,
  }) async {
    await showDialog(
      context: context,
      builder: (context) {
        return EditChatMessageDialog(
          message: message,
        );
      },
    );
  }

  ValueNotifier<ChatMessage?> reply = ValueNotifier<ChatMessage?>(null);
  bool get replyEnabled => reply.value != null;
  clearReply() => reply.value = null;
}
