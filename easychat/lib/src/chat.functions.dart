import 'package:easy_locale/easy_locale.dart';
import 'package:easychat/easychat.dart';
import 'package:easyuser/easyuser.dart';
import 'package:firebase_auth/firebase_auth.dart' hide User;
import 'package:easy_helpers/easy_helpers.dart';
import 'package:firebase_database/firebase_database.dart';

const String chatRoomDivider = '---';

// /// 채팅방 ID 에서, 1:1 채팅방인지 확인한다.
bool isSingleChatRoom(String roomId) {
  final splits = roomId.split(chatRoomDivider);
  return splits.length == 2 && splits[0].isNotEmpty && splits[1].isNotEmpty;
}

/// Returns the other user's uid from the 1:1 chat room ID.
///
/// If it is a group chat room ID, it returns null.
/// If the user didn't login, it returns null.
///
/// 1:1 채팅방 ID 에서 다른 사용자의 uid 를 리턴한다.
///
/// 그룹 채팅방 ID 이면, null 을 리턴한다.
///
/// 주의, 자기 자신과 대화를 할 수 있으니, 그 경우에는 자기 자신의 uid 를 리턴한다.
String? getOtherUserUidFromRoomId(String roomId) {
  //
  final currentUser = FirebaseAuth.instance.currentUser;
  if (currentUser == null) return null;
  final splits = roomId.split(chatRoomDivider);
  if (splits.length != 2) {
    return null;
  }
  for (final uid in splits) {
    if (uid != currentUser.uid) {
      return uid;
    }
  }
  return currentUser.uid;
}

/// Returns a chat room ID from a user's uid.
/// 대화할 상대방의 UID 를 입력 받아, 일대일 채팅방 ID 를 만든다.
///
/// 로그인 사용자의 uid 와 [otherUserUid] 를 정렬해서 합친다.
String singleChatRoomId(String otherUserUid) {
  if (FirebaseAuth.instance.currentUser?.uid == null) {
    // throw 'chat/auth-required Loign to get the sing chat room id';
    throw ChatException(
      'auth-required',
      'login to get the single chat room id'.t,
    );
  }
  final uids = [FirebaseAuth.instance.currentUser!.uid, otherUserUid];
  uids.sort();
  return uids.join(chatRoomDivider);
}

/// Returns the chat room title for single and group chat.
String roomTitle(ChatRoom? room, User? user, ChatJoin? join) {
  assert(room != null || user != null || join != null);

  if (user != null) {
    return user.displayName.or('no name'.t);
  }

  // Single chat or group chat can have name.
  if ((room?.name ?? "").trim().isNotEmpty) {
    return room!.name;
  }

  if (join == null) return 'chat room'.t;

  if (join.group) {
    return join.name ?? 'no name'.t;
    // CONSIDER: group has no name? put some default value from configuration.
    // Issue: Need to consider the translations.
  }
  if (join.single) {
    return join.displayName ?? 'no name'.t;
    // CONSIDER: if the user has no name then, display some default value from the configuration.
    // Issue: Need to consider the translations.
  }

  return 'chat room'.t;
}

/// Returns the server timestamp.
///
/// There is no way to get server timestamp in client side. So, it writes the
/// timestamp placeholder to the server, and then reads it back.
///
/// It returns unix timestamp in milliseconds.
///
/// Why:
/// - To save the order with the server timestamp. Especially chat rooms.
///
/// * Caution:
/// - Use it with careful since it produces an extra write and read operation
///   and it may cause preformance issue even though it won't cause too much
///   performance issue and cost problem.
/// - Don't use it for saving chat messages which needs ultamite performance
///   for writing and the chat messages are often created. Use this only for
///   ordering the chat rooms.
///
/// * Recommendation
/// - If the time is used for the login user only, simple user [DateTime].
/// - If the time is used for multiple users, use this function to the server time.
Future<int> getServerTimestamp() async {
  final ref = FirebaseDatabase.instance
      .ref()
      .child('chat')
      .child('-info')
      .child('timestamp');
  await ref.set(ServerValue.timestamp);
  final snapshot = await ref.get();
  return snapshot.value as int;
}

/// Returns the chat room reference. Shotcut for the ChatService.instance.roomRef(roomId).
DatabaseReference roomRef(String roomId) =>
    ChatService.instance.roomsRef.child(roomId);
